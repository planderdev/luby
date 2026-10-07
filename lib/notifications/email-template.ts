import { EMAIL_CATEGORY_LABEL, type EmailCategory } from "@/lib/notification-categories";
import { unsubscribeUrl } from "@/lib/unsubscribe-token";
import { dashboardDict } from "@/lib/i18n/app/dashboard";
import { withLang } from "@/lib/i18n/app-locale-shared";
import type { Locale } from "@/lib/i18n/config";

/** 메일 크롬 문구 — 제목·본문은 lib/notifications/localize 가 수신자 언어로 바꿔 넘긴다 */
const EMAIL_UI: Record<Locale, { ctaDigest: string; cta: string; sentBy: (cat: string) => string; settings: string; unsubCat: string; unsubAll: string; contact: string; font: string }> = {
  ko: { ctaDigest: "대시보드에서 보기", cta: "확인하러 가기", sentBy: (c) => `이 메일은 Luby AI 알림 설정에 따라 발송되었습니다 (${c}).`, settings: "이메일 알림 설정", unsubCat: "이 종류 메일 수신 거부", unsubAll: "모든 이메일 수신 거부", contact: "문의: contact@plander.io · (주)플랜더 · 제주특별자치도 제주시 관덕로 44, 제주소통협력센터 404호", font: "'Apple SD Gothic Neo','Malgun Gothic',sans-serif" },
  en: { ctaDigest: "View in dashboard", cta: "Open in Luby AI", sentBy: (c) => `You received this email because of your Luby AI notification settings (${c}).`, settings: "Email settings", unsubCat: "Unsubscribe from this type", unsubAll: "Unsubscribe from all emails", contact: "Contact: contact@plander.io · Plander Inc. · 404, Jeju Communication & Cooperation Center, 44 Gwandeok-ro, Jeju-si, Jeju, Korea", font: "-apple-system,'Segoe UI',Roboto,sans-serif" },
  zh: { ctaDigest: "在控制台查看", cta: "前往查看", sentBy: (c) => `您收到此邮件是因为您的 Luby AI 通知设置（${c}）。`, settings: "邮件通知设置", unsubCat: "退订此类邮件", unsubAll: "退订全部邮件", contact: "联系：contact@plander.io · Plander 株式会社 · 韩国济州特别自治道济州市观德路 44 号 济州沟通协力中心 404 室", font: "'PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif" },
};

/**
 * 알림 이메일 HTML 렌더 — 사용자 입력(제목·본문)은 이스케이프, 다이제스트는 목록으로.
 * 라우트(app/api/notifications/email)와 테스트 스크립트에서 공용.
 */
export function renderNotificationEmail(input: {
  userId: string;
  title: string;
  body: string | null | undefined;
  link: string | null | undefined;
  category: EmailCategory;
  siteUrl?: string;
  /** 수신자 언어(profiles.locale) — 크롬 문구·링크 ?lang= (기본 ko) */
  locale?: Locale;
}): { subject: string; html: string; link: string } {
  const payload = input;
  const category = input.category;
  const locale: Locale = input.locale ?? "ko";
  const ui = EMAIL_UI[locale];
  const siteUrl = input.siteUrl ?? process.env.NEXT_PUBLIC_SITE_URL ?? "https://luby.im";
  const safePath = payload.link && /^\/(?!\/)/.test(payload.link) ? payload.link : "/dashboard";
  const link = `${siteUrl}${withLang(safePath, locale)}`;
  const catLabel = locale === "ko" ? EMAIL_CATEGORY_LABEL[category].label : dashboardDict[locale].settings.emailPrefs.cats[category]?.label ?? EMAIL_CATEGORY_LABEL[category].label;
  // 제목·본문은 사용자 입력(캠페인 제목·메시지 등)을 포함하므로 반드시 이스케이프
  const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const title = esc(payload.title);
  // 다이제스트는 ' · ' 로 이어진 항목을 목록으로, 그 외는 문단으로
  const items = payload.body ? payload.body.split(" · ").map((x) => x.trim()).filter(Boolean) : [];
  const bodyHtml = !payload.body
    ? ""
    : category === "digest" && items.length >= 2
      ? `<ul style="margin:0 0 24px;padding:0;list-style:none;">${items
          .map((x) => `<li style="position:relative;padding:6px 0 6px 18px;font-size:14px;line-height:1.6;color:#d4d4d4;border-bottom:1px solid #262626;"><span style="position:absolute;left:0;top:12px;width:6px;height:6px;border-radius:999px;background:#f43f8e;"></span>${esc(x)}</li>`)
          .join("")}</ul>`
      : `<p style="margin:0 0 24px;font-size:14px;line-height:1.7;color:#a3a3a3;">${esc(payload.body)}</p>`;
  const cta = category === "digest" ? ui.ctaDigest : ui.cta;
  const html = `<!DOCTYPE html>
<html lang="${locale}"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head><body style="margin:0;padding:0;background:#0a0a0a;font-family:${ui.font};">
  <div style="max-width:520px;margin:0 auto;padding:40px 24px;">
    <img src="${siteUrl}/logo-email.png" width="89" height="28" alt="Luby AI" style="display:block;height:28px;width:auto;border:0;margin-bottom:28px;" />
    <div style="background:#171717;border:1px solid #262626;border-radius:20px;padding:28px;">
      <h1 style="margin:0 0 12px;font-size:18px;color:#ffffff;">${title}</h1>
      ${bodyHtml}
      <a href="${link}" style="display:inline-block;background:#f43f8e;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:999px;">${cta}</a>
    </div>
    <p style="margin:24px 0 0;font-size:12px;color:#525252;line-height:1.7;">${esc(ui.sentBy(catLabel))}<br/>
      <a href="${siteUrl}${withLang("/dashboard/settings", locale)}#email" style="color:#737373;">${ui.settings}</a> ·
      <a href="${unsubscribeUrl(siteUrl, payload.userId, category, locale)}" style="color:#737373;">${ui.unsubCat}</a> ·
      <a href="${unsubscribeUrl(siteUrl, payload.userId, "all", locale)}" style="color:#737373;">${ui.unsubAll}</a><br/>
      ${esc(ui.contact)}</p>
  </div>
</body></html>`;

  const subject = `[Luby AI] ${payload.title.replace(/[\r\n]+/g, " ").slice(0, 120)}`;
  return { subject, html, link };
}
