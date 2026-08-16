import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";

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
    .select("email, name")
    .eq("id", payload.user_id)
    .maybeSingle();

  if (!profile?.email) {
    return NextResponse.json({ skipped: true, reason: "recipient not found" });
  }
  // 테스트 계정(@ruby-ai.kr 가상 주소)에는 발송하지 않음
  if (profile.email.endsWith("@ruby-ai.kr")) {
    return NextResponse.json({ skipped: true, reason: "test account" });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://luby.im";
  const link = payload.link ? `${siteUrl}${payload.link}` : `${siteUrl}/dashboard`;
  const html = `<!DOCTYPE html>
<html lang="ko"><body style="margin:0;padding:0;background:#0a0a0a;font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:40px 24px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;"><tr>
      <td style="vertical-align:middle;"><img src="${siteUrl}/symbol-128.png" width="36" height="36" alt="Luby" style="display:block;border-radius:10px;" /></td>
      <td style="padding-left:12px;vertical-align:middle;font-size:18px;font-weight:700;color:#ffffff;">Luby AI</td>
    </tr></table>
    <div style="background:#171717;border:1px solid #262626;border-radius:20px;padding:28px;">
      <h1 style="margin:0 0 12px;font-size:18px;color:#ffffff;">${payload.title}</h1>
      ${payload.body ? `<p style="margin:0 0 24px;font-size:14px;line-height:1.7;color:#a3a3a3;">${payload.body}</p>` : ""}
      <a href="${link}" style="display:inline-block;background:#f43f8e;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:999px;">확인하러 가기</a>
    </div>
    <p style="margin:24px 0 0;font-size:12px;color:#525252;">이 메일은 Luby AI 알림 설정에 따라 발송되었습니다.<br/>문의: contact@plander.io</p>
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
