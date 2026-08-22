import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { categoryOf, normalizePrefs } from "@/lib/notification-categories";
import { renderNotificationEmail } from "@/lib/notifications/email-template";

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

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    // 이메일 발송 미설정 — 인앱 알림만 사용 중
    return NextResponse.json({ skipped: true, reason: "RESEND_API_KEY not configured" });
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

  // 이메일 수신 설정 존중 (인앱 알림은 이미 생성됨)
  const category = categoryOf(payload.type);
  const prefs = normalizePrefs(profile.email_prefs);
  if (!prefs[category]) {
    return NextResponse.json({ skipped: true, reason: `email pref off: ${category}` });
  }
  // 발송 제외 도메인: @ruby-ai.kr(테스트 가상 주소), @luby.im(수신 MX 미설정 — 반송 방지. 수신함 개설 후 NOTIFY_SKIP_DOMAINS 에서 제거)
  const skipDomains = (process.env.NOTIFY_SKIP_DOMAINS ?? "ruby-ai.kr,luby.im")
    .split(",").map((d) => d.trim().toLowerCase()).filter(Boolean);
  const domain = profile.email.split("@")[1]?.toLowerCase() ?? "";
  if (skipDomains.includes(domain)) {
    return NextResponse.json({ skipped: true, reason: `skip domain ${domain}` });
  }

  const { subject, html } = renderNotificationEmail({
    userId: payload.user_id,
    title: payload.title,
    body: payload.body,
    link: payload.link,
    category,
  });

  const res = await fetch("https://api.resend.com/emails", {
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

  if (!res.ok) {
    const err = await res.text();
    console.error("Resend 발송 실패:", res.status, err.slice(0, 200));
    return NextResponse.json({ ok: false, status: res.status });
  }

  return NextResponse.json({ ok: true });
}
