import type { Locale } from "@/lib/i18n/config";

/** 앱(가입·온보딩·응모 화면) 언어 — 쿠키 이름. 공개 페이지(/en, /zh)에서 넘어올 때 ?lang= 으로 전달되고 쿠키로 굳는다. */
export const APP_LOCALE_COOKIE = "luby_lang";

export function parseAppLocale(v: string | null | undefined): Locale | null {
  return v === "ko" || v === "en" || v === "zh" ? v : null;
}

/** 내부 링크에 ?lang= 을 붙인다(ko 는 생략). 공개 페이지 CTA → /signup, /login 전달용 */
export function withLang(href: string, locale: Locale | null | undefined): string {
  if (!locale || locale === "ko") return href;
  if (/[?&]lang=/.test(href)) return href;
  return `${href}${href.includes("?") ? "&" : "?"}lang=${locale}`;
}
