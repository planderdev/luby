import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { categoryOf, normalizePrefs } from "@/lib/notification-categories";
import { renderNotificationEmail } from "@/lib/notifications/email-template";
import { sendPushToUser } from "@/lib/notifications/push";

export const maxDuration = 15;

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
    .select("email, name, email_prefs")
    .eq("id", payload.user_id)
    .maybeSingle();

  if (!profile?.email) {
    return NextResponse.json({ skipped: true, reason: "recipient not found" });
  }

  // 수신 설정(카테고리)은 이메일·푸시에 동일 적용 (인앱 알림은 이미 생성됨)
  const category = categoryOf(payload.type);
  const prefs = normalizePrefs(profile.email_prefs);
  if (!prefs[category]) {
    return NextResponse.json({ skipped: true, reason: `pref off: ${category}` });
  }

  // 1) 웹 푸시 — 구독한 기기가 있으면 발송 (도메인 제외 규칙과 무관)
  const push = await sendPushToUser(payload.user_id, { title: payload.title, body: payload.body, link: payload.link, tag: payload.type ?? undefined });

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
  if (skipDomains.includes(domain)) {
    return NextResponse.json({ push, email: { skipped: true, reason: `skip domain ${domain}` } });
  }

  const { subject, html } = renderNotificationEmail({
    userId: payload.user_id,
    title: payload.title,
    body: payload.body,
    link: payload.link,
    category,
  });

  // Resend API 는 초당 2건 제한 — 일괄 승인처럼 알림이 한꺼번에 만들어지면 웹훅이 동시에 몰려 429 가 난다.
  // (2026-08-31 일괄 승인 31건 중 21건이 429 로 유실) 지터를 섞은 재시도로 버스트를 흩뜨린다.
  let res: Response | null = null;
  for (let attempt = 0; attempt < 4; attempt++) {
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
      }),
    });
    if (res.status !== 429) break;
  }
  res = res!;

  if (!res.ok) {
    const err = await res.text();
    console.error("Resend 발송 실패:", res.status, err.slice(0, 200));
    return NextResponse.json({ ok: false, push, status: res.status });
  }

  return NextResponse.json({ ok: true, push });
}
