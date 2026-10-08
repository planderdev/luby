import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { verifyUnsubscribeAny } from "@/lib/unsubscribe-token";
import { normalizePrefs, EMAIL_CATEGORY_LABEL, type EmailCategory } from "@/lib/notification-categories";
import { parseAppLocale } from "@/lib/i18n/app-locale-shared";
import { dashboardDict } from "@/lib/i18n/app/dashboard";
import type { Locale } from "@/lib/i18n/config";

const UI: Record<Locale, { badTitle: string; badBody: string; noneTitle: string; noneBody: string; doneTitle: string; doneBody: (label: string) => string; all: string; typeMail: (l: string) => string; button: string }> = {
  ko: { badTitle: "링크가 올바르지 않아요", badBody: "수신 거부 링크가 만료되었거나 변조되었습니다. 로그인 후 설정 → 이메일 알림에서 직접 변경해 주세요.", noneTitle: "계정을 찾을 수 없어요", noneBody: "이미 탈퇴했거나 존재하지 않는 계정입니다.", doneTitle: "수신 거부가 완료됐어요", doneBody: (l) => `${l}을 더 이상 보내지 않습니다. 앱 안의 알림은 그대로 유지되며, 언제든 설정 → 이메일 알림에서 다시 켤 수 있어요.`, all: "모든 이메일 알림", typeMail: (l) => `"${l}" 이메일`, button: "이메일 알림 설정 열기" },
  en: { badTitle: "This link isn't valid", badBody: "The unsubscribe link has expired or was altered. Log in and change it under Settings → Email notifications.", noneTitle: "Account not found", noneBody: "This account was deleted or does not exist.", doneTitle: "You're unsubscribed", doneBody: (l) => `We'll stop sending ${l}. In-app notifications stay on, and you can turn emails back on any time under Settings → Email notifications.`, all: "all email notifications", typeMail: (l) => `"${l}" emails`, button: "Open email settings" },
  zh: { badTitle: "链接无效", badBody: "退订链接已过期或被篡改。请登录后在 设置 → 邮件通知 中自行修改。", noneTitle: "找不到账号", noneBody: "该账号已注销或不存在。", doneTitle: "已退订", doneBody: (l) => `我们将不再发送${l}。应用内通知保持不变，您可随时在 设置 → 邮件通知 中重新开启。`, all: "全部邮件通知", typeMail: (l) => `「${l}」邮件`, button: "打开邮件通知设置" },
};

/**
 * 원클릭 이메일 수신 거부 (메일 하단 링크). 로그인 불필요 — HMAC 토큰으로 본인 확인.
 * GET /api/notifications/unsubscribe?u=<userId>&c=<reminders|transactional|digest|all>&t=<token>
 */
export async function GET(request: Request) {
  return handle(request, "html");
}

/** RFC 8058 원클릭 수신 거부 — 메일 클라이언트가 List-Unsubscribe URL 로 POST(List-Unsubscribe=One-Click) 한다. 본문은 보지 않고 URL 토큰만 검증 */
export async function POST(request: Request) {
  return handle(request, "text");
}

async function handle(request: Request, mode: "html" | "text") {
  const { searchParams } = new URL(request.url);
  const u = searchParams.get("u") ?? "";
  const c = (searchParams.get("c") ?? "") as EmailCategory | "all";
  const t = searchParams.get("t") ?? "";
  const locale: Locale = parseAppLocale(searchParams.get("lang")) ?? "ko";
  const ui = UI[locale];
  const valid = ["reminders", "transactional", "digest", "all"].includes(c) && /^[0-9a-f-]{36}$/.test(u);
  if (!valid || !(await verifyUnsubscribeAny(u, c, t))) {
    return mode === "text" ? new NextResponse("invalid", { status: 400 }) : html(ui.badTitle, ui.badBody, 400, locale);
  }
  const admin = getAdminSupabase();
  const { data: p } = await admin.from("profiles").select("email_prefs").eq("id", u).maybeSingle();
  if (!p) return mode === "text" ? new NextResponse("not found", { status: 404 }) : html(ui.noneTitle, ui.noneBody, 404, locale);
  const prefs = normalizePrefs(p.email_prefs);
  if (c === "all") { prefs.transactional = false; prefs.reminders = false; prefs.digest = false; }
  else prefs[c] = false;
  await admin.from("profiles").update({ email_prefs: prefs }).eq("id", u);
  const catLabel = c === "all" ? "" : locale === "ko" ? EMAIL_CATEGORY_LABEL[c].label : dashboardDict[locale].settings.emailPrefs.cats[c]?.label ?? EMAIL_CATEGORY_LABEL[c].label;
  const label = c === "all" ? ui.all : ui.typeMail(catLabel);
  return mode === "text" ? new NextResponse("ok", { status: 200 }) : html(ui.doneTitle, ui.doneBody(label), 200, locale);
}

function html(title: string, body: string, status: number, locale: Locale = "ko") {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://luby.im";
  return new NextResponse(
    `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} — Luby AI</title>
<style>body{margin:0;font-family:-apple-system,"Apple SD Gothic Neo",sans-serif;background:#0a0a0c;color:#f5f5f7;display:flex;min-height:100dvh;align-items:center;justify-content:center;padding:24px}
.card{max-width:440px;background:#15151a;border:1px solid #26262e;border-radius:24px;padding:32px}h1{font-size:20px;margin:16px 0 8px}p{color:#9ca0ac;font-size:14px;line-height:1.7;margin:0}
a{display:inline-block;margin-top:24px;background:#f5f5f7;color:#0a0a0c;text-decoration:none;font-weight:600;font-size:14px;padding:10px 18px;border-radius:999px}</style></head>
<body><div class="card"><img src="${site}/logo-email.png" alt="Luby AI" height="24" style="display:block;height:24px"><h1>${title}</h1><p>${body}</p><a href="${site}/dashboard/settings${locale !== "ko" ? `?lang=${locale}` : ""}#email">${UI[locale].button}</a></div></body></html>`,
    { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } }
  );
}
