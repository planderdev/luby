import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { categoryOf, normalizePrefs } from "@/lib/notification-categories";
import { renderNotificationEmail } from "@/lib/notifications/email-template";
import { sendPushToUser } from "@/lib/notifications/push";
import { localizeNotification } from "@/lib/notifications/localize";
import { parseAppLocale } from "@/lib/i18n/app-locale-shared";
import { unsubscribeUrl } from "@/lib/unsubscribe-token";
import { getSuppression } from "@/lib/resend-suppressions";
import { relayForUnreachableAdvertiser, adminRelayDeps } from "@/lib/notifications/unreachable-relay";

// 429 재시도가 최대 ~15초까지 기다릴 수 있어 여유를 둔다 (다이제스트 20명 버스트 = 초당 2건 제한에서 ~10초 소요)
export const maxDuration = 30;

/**
 * 알림 생성 시 DB 트리거(pg_net)가 호출하는 이메일 발송 웹훅.
 * - x-webhook-secret으로 인증 (DB 트리거와 공유)
 * - RESEND_API_KEY가 없으면 조용히 no-op (인앱 알림만으로 동작)
 * - Resend 도메인 인증 완료 후 키만 넣으면 즉시 발송 시작
 */
export async function POST(request: Request) {
  const secret = process.env.NOTIFICATION_WEBHOOK_SECRET;
  if (!secret || request.headers.get("x-webhook-secret") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let payload: {
    user_id?: string;
    type?: string;
    title?: string;
    body?: string | null;
    link?: string | null;
  };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  if (!payload.user_id || !payload.title) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  // 수신자 조회 (service role — 웹훅은 인증 사용자 컨텍스트가 없음)
  const admin = getAdminSupabase();
  const { data: profile } = await admin
    .from("profiles")
    .select("email, name, email_prefs, locale, role, is_demo")
    .eq("id", payload.user_id)
    .maybeSingle();

  if (!profile?.email) {
    return NextResponse.json({ skipped: true, reason: "recipient not found" });
  }

  // 이메일 인증 리마인더(2026-10-07): 알림 메일 대신 Supabase 의 가입 인증 메일(확인 링크 포함)을 다시 보낸다.
  // 미인증 계정은 어차피 로그인할 수 없으니 인앱 알림·푸시는 의미가 없다 — 인증 메일만.
  if (payload.type === "confirm_email_reminder") {
    const { error } = await admin.auth.resend({ type: "signup", email: profile.email });
    if (error) {
      console.error("[confirm_email_reminder] resend failed", payload.user_id, error.message);
      return NextResponse.json({ email: { skipped: true, reason: error.message } });
    }
    return NextResponse.json({ email: { sent: true, kind: "confirmation" } });
  }

  // 연락 불가 광고주(메일 반송·한 번도 로그인 안 함)에게 처리할 일이 생기면 운영자에게 '[대신 확인]' 알림을 한 번 더 만든다.
  // 수신 설정과 무관하게 판단한다 — 광고주가 메일을 꺼 둔 것이 아니라 아예 닿지 않는 경우다(2026-10-11).
  const suppression = await getSuppression(admin, profile.email);
  const relay = await relayForUnreachableAdvertiser(
    {
      userId: payload.user_id,
      role: profile.role,
      email: profile.email,
      name: profile.name,
      type: payload.type ?? null,
      title: payload.title,
      body: payload.body ?? null,
      link: payload.link ?? null,
      suppressed: !!suppression,
      demo: !!profile.is_demo,
    },
    adminRelayDeps(admin),
  ).catch((e) => ({ relayed: 0, skipped: `relay error: ${e instanceof Error ? e.message : String(e)}` }));

  // 수신 설정(카테고리)은 이메일·푸시에 동일 적용 (인앱 알림은 이미 생성됨)
  const category = categoryOf(payload.type);
  const prefs = normalizePrefs(profile.email_prefs);
  if (!prefs[category]) {
    return NextResponse.json({ skipped: true, relay, reason: `pref off: ${category}` });
  }

  // 수신자 언어(2026-10-07 다국어 5단계): DB 가 만든 한국어 제목·본문을 알려진 type 이면 en/zh 로 바꾼다 (모르면 원문)
  const locale = parseAppLocale(profile.locale) ?? "ko";
  const loc = localizeNotification({ type: payload.type, title: payload.title, body: payload.body }, locale);

  // 1) 웹 푸시 — 구독한 기기가 있으면 발송 (도메인 제외 규칙과 무관)
  const push = await sendPushToUser(payload.user_id, { title: loc.title, body: loc.body, link: payload.link, tag: payload.type ?? undefined });

  // 운영 내부 알림은 이메일을 보내지 않는다(인앱·푸시로 충분).
  // 가입 1명당 운영자 3명에게 메일이 나가 Resend 하루 한도(100통)의 6할을 태웠다 — 2026-08-29 유입 급증 때
  // 이 메일들이 한도를 소진해 정작 신규 가입자의 인증 메일이 막혔다.
  const IN_APP_ONLY = new Set(["user_approval_requested", "operator_notice"]);
  if (payload.type && IN_APP_ONLY.has(payload.type)) {
    return NextResponse.json({ push, email: { skipped: true, reason: `in-app only: ${payload.type}` } });
  }

  // 2) 이메일
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return NextResponse.json({ push, email: { skipped: true, reason: "RESEND_API_KEY not configured" } });
  }
  // 발송 제외 도메인: @ruby-ai.kr(테스트 가상 주소), @luby.im(수신 MX 미설정 — 반송 방지. 수신함 개설 후 NOTIFY_SKIP_DOMAINS 에서 제거)
  const skipDomains = (process.env.NOTIFY_SKIP_DOMAINS ?? "ruby-ai.kr,luby.im")
    .split(",").map((d) => d.trim().toLowerCase()).filter(Boolean);
  const domain = profile.email.split("@")[1]?.toLowerCase() ?? "";
  if (skipDomains.includes(domain) || profile.is_demo) {
    return NextResponse.json({ push, relay, email: { skipped: true, reason: profile.is_demo ? "demo account" : `skip domain ${domain}` } });
  }
  // Resend 차단 목록(하드 바운스·스팸 신고)에 있는 주소는 보내도 'suppressed' 로 버려진다 — 한도만 쓰므로 건너뛴다
  if (suppression) {
    return NextResponse.json({ push, relay, email: { skipped: true, reason: `suppressed: ${suppression.origin}` } });
  }

  // RFC 8058 원클릭 수신 거부 헤더 — Gmail/Yahoo 가 '수신 거부' 버튼을 띄우고 발신 평판에 유리하다. 같은 카테고리만 끈다(2026-10-07)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://luby.im";
  const listUnsub = unsubscribeUrl(siteUrl, payload.user_id, category, locale);
  const { subject, html } = renderNotificationEmail({
    userId: payload.user_id,
    title: loc.title,
    body: loc.body,
    link: payload.link,
    category,
    locale,
  });

  // Resend API 는 초당 2건 제한 — 일괄 승인처럼 알림이 한꺼번에 만들어지면 웹훅이 동시에 몰려 429 가 난다.
  // (2026-08-31 일괄 승인 31건 중 21건이 429 로 유실) 지터를 섞은 재시도로 버스트를 흩뜨린다.
  let res: Response | null = null;
  for (let attempt = 0; attempt < 6; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 700 * attempt + Math.random() * 800));
    res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Luby AI <notify@luby.im>",
        to: [profile.email],
        subject,
        html,
        headers: {
          "List-Unsubscribe": `<${listUnsub}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      }),
    });
    if (res.status !== 429) break;
  }
  res = res!;

  if (!res.ok) {
    const err = await res.text();
    console.error("Resend 발송 실패:", res.status, err.slice(0, 200));
    return NextResponse.json({ ok: false, push, relay, status: res.status });
  }

  return NextResponse.json({ ok: true, push, relay });
}
