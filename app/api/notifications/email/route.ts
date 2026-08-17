import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { categoryOf, normalizePrefs, EMAIL_CATEGORY_LABEL } from "@/lib/notification-categories";
import { unsubscribeUrl } from "@/lib/unsubscribe-token";

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

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://luby.im";
  const link = payload.link ? `${siteUrl}${payload.link}` : `${siteUrl}/dashboard`;
  const html = `<!DOCTYPE html>
<html lang="ko"><body style="margin:0;padding:0;background:#0a0a0a;font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:40px 24px;">
    <img src="${siteUrl}/logo-email.png" width="89" height="28" alt="Luby AI" style="display:block;height:28px;width:auto;border:0;margin-bottom:28px;" />
    <div style="background:#171717;border:1px solid #262626;border-radius:20px;padding:28px;">
      <h1 style="margin:0 0 12px;font-size:18px;color:#ffffff;">${payload.title}</h1>
      ${payload.body ? `<p style="margin:0 0 24px;font-size:14px;line-height:1.7;color:#a3a3a3;">${payload.body}</p>` : ""}
      <a href="${link}" style="display:inline-block;background:#f43f8e;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:999px;">확인하러 가기</a>
    </div>
    <p style="margin:24px 0 0;font-size:12px;color:#525252;line-height:1.7;">이 메일은 Luby AI 알림 설정에 따라 발송되었습니다 (${EMAIL_CATEGORY_LABEL[category].label}).<br/>
      <a href="${siteUrl}/dashboard/settings#email" style="color:#737373;">이메일 알림 설정</a> ·
      <a href="${unsubscribeUrl(siteUrl, payload.user_id, category)}" style="color:#737373;">이 종류 메일 수신 거부</a> ·
      <a href="${unsubscribeUrl(siteUrl, payload.user_id, "all")}" style="color:#737373;">모든 이메일 수신 거부</a><br/>
      문의: contact@plander.io · (주)플랜더 · 제주특별자치도 제주시 관덕로 44, 제주소통협력센터 404호</p>
  </div>
</body></html>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Luby AI <notify@luby.im>",
      to: [profile.email],
      subject: `[Luby AI] ${payload.title}`,
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
