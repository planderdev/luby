import type { Locale } from "./config";

/**
 * 캠페인 본문만 번역해 보여주는 추가 언어 — 화면 문구(버튼·라벨) 사전은 없고 ui 로케일의 것을 빌려 쓴다.
 * 공개 주소는 /c/<id>/<slug>, 번역본은 campaign_translations.locale = code 로 저장된다.
 * 언어를 더하려면 여기에 한 줄 + campaign_translations_locale_check 제약에 code 추가.
 */
export const EXTRA_CONTENT_LANGS = [
  { slug: "ja", code: "ja", native: "日本語", english: "Japanese", ui: "en" },
  { slug: "zh-tw", code: "zh-TW", native: "繁體中文", english: "Traditional Chinese (zh-TW; Taiwan / Hong Kong reader friendly)", ui: "zh" },
  { slug: "th", code: "th", native: "ไทย", english: "Thai", ui: "en" },
  { slug: "vi", code: "vi", native: "Tiếng Việt", english: "Vietnamese", ui: "en" },
  { slug: "id", code: "id", native: "Bahasa Indonesia", english: "Indonesian (Bahasa Indonesia)", ui: "en" },
] as const satisfies readonly { slug: string; code: string; native: string; english: string; ui: Locale }[];

export type ExtraContentLang = (typeof EXTRA_CONTENT_LANGS)[number];
export type ExtraContentCode = ExtraContentLang["code"];

export function extraLangBySlug(slug: string): ExtraContentLang | undefined {
  return EXTRA_CONTENT_LANGS.find((l) => l.slug === slug.toLowerCase());
}

/** 화면 로케일(ko·en·zh) 표기 — 언어 선택 줄·공유 메뉴 공용 */
export const BASE_LANG_NATIVE: Record<Locale, string> = { ko: "한국어", en: "English", zh: "简体中文" };
