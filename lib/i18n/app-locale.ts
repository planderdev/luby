import { cookies } from "next/headers";
import type { Locale } from "@/lib/i18n/config";
import { APP_LOCALE_COOKIE, parseAppLocale } from "./app-locale-shared";

/**
 * 서버에서 앱 화면의 언어를 정한다: ?lang= → 쿠키 → 프로필 locale → ko.
 * (cookies() 를 읽으므로 호출한 페이지는 동적 렌더가 된다 — 인증 화면은 어차피 동적)
 */
export async function getAppLocale(opts: { param?: string | null; profileLocale?: string | null } = {}): Promise<Locale> {
  const fromParam = parseAppLocale(opts.param);
  if (fromParam) return fromParam;
  try {
    const jar = await cookies();
    const fromCookie = parseAppLocale(jar.get(APP_LOCALE_COOKIE)?.value);
    if (fromCookie) return fromCookie;
  } catch {
    /* 정적 컨텍스트 등 — 아래 순서로 */
  }
  return parseAppLocale(opts.profileLocale) ?? "ko";
}
