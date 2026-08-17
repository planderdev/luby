import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { verifyUnsubscribe } from "@/lib/unsubscribe-token";
import { normalizePrefs, EMAIL_CATEGORY_LABEL, type EmailCategory } from "@/lib/notification-categories";

/**
 * 원클릭 이메일 수신 거부 (메일 하단 링크). 로그인 불필요 — HMAC 토큰으로 본인 확인.
 * GET /api/notifications/unsubscribe?u=<userId>&c=<reminders|transactional|digest|all>&t=<token>
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const u = searchParams.get("u") ?? "";
  const c = (searchParams.get("c") ?? "") as EmailCategory | "all";
  const t = searchParams.get("t") ?? "";
  const valid = ["reminders", "transactional", "digest", "all"].includes(c) && /^[0-9a-f-]{36}$/.test(u);
  if (!valid || !verifyUnsubscribe(u, c, t)) {
    return html("링크가 올바르지 않아요", "수신 거부 링크가 만료되었거나 변조되었습니다. 로그인 후 설정 → 이메일 알림에서 직접 변경해 주세요.", 400);
  }
  const admin = getAdminSupabase();
  const { data: p } = await admin.from("profiles").select("email_prefs").eq("id", u).maybeSingle();
  if (!p) return html("계정을 찾을 수 없어요", "이미 탈퇴했거나 존재하지 않는 계정입니다.", 404);
  const prefs = normalizePrefs(p.email_prefs);
  if (c === "all") { prefs.transactional = false; prefs.reminders = false; prefs.digest = false; }
  else prefs[c] = false;
  await admin.from("profiles").update({ email_prefs: prefs }).eq("id", u);
  const label = c === "all" ? "모든 이메일 알림" : `"${EMAIL_CATEGORY_LABEL[c].label}" 이메일`;
  return html("수신 거부가 완료됐어요", `${label}을 더 이상 보내지 않습니다. 앱 안의 알림은 그대로 유지되며, 언제든 설정 → 이메일 알림에서 다시 켤 수 있어요.`, 200);
}

function html(title: string, body: string, status: number) {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://luby.im";
  return new NextResponse(
    `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} — Luby AI</title>
<style>body{margin:0;font-family:-apple-system,"Apple SD Gothic Neo",sans-serif;background:#0a0a0c;color:#f5f5f7;display:flex;min-height:100dvh;align-items:center;justify-content:center;padding:24px}
.card{max-width:440px;background:#15151a;border:1px solid #26262e;border-radius:24px;padding:32px}h1{font-size:20px;margin:16px 0 8px}p{color:#9ca0ac;font-size:14px;line-height:1.7;margin:0}
a{display:inline-block;margin-top:24px;background:#f5f5f7;color:#0a0a0c;text-decoration:none;font-weight:600;font-size:14px;padding:10px 18px;border-radius:999px}</style></head>
<body><div class="card"><img src="${site}/logo-email.png" alt="Luby AI" height="24" style="display:block;height:24px"><h1>${title}</h1><p>${body}</p><a href="${site}/dashboard/settings#email">이메일 알림 설정 열기</a></div></body></html>`,
    { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } }
  );
}
