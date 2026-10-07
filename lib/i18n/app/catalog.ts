import type { Locale } from "@/lib/i18n/config";

/**
 * DB 카탈로그(categories.name·regions.name)는 한국어/영어 고정값 — 가입·온보딩·응모 화면에서는 slug/code 로 언어별 이름을 붙인다.
 * 새 분야·지역을 DB 에 추가하면 여기도 채울 것(없으면 DB 값 그대로).
 */
const CATEGORY: Record<string, { en: string; zh: string }> = {
  beauty: { en: "Beauty", zh: "美妆" },
  food: { en: "Food & dining", zh: "美食·餐饮" },
  fashion: { en: "Fashion", zh: "时尚" },
  tech: { en: "Tech & IT", zh: "科技·数码" },
  lifestyle: { en: "Lifestyle", zh: "生活方式" },
  travel: { en: "Travel & stays", zh: "旅行·住宿" },
  parenting: { en: "Parenting & kids", zh: "育儿·亲子" },
  pet: { en: "Pets", zh: "宠物" },
};
const REGION: Record<string, { en: string; zh: string }> = {
  KR: { en: "Korea", zh: "韩国" },
  JP: { en: "Japan", zh: "日本" },
  US: { en: "USA", zh: "美国" },
  TW: { en: "Taiwan", zh: "台湾" },
  TH: { en: "Thailand", zh: "泰国" },
  VN: { en: "Vietnam", zh: "越南" },
  ID: { en: "Indonesia", zh: "印度尼西亚" },
  PH: { en: "Philippines", zh: "菲律宾" },
  SG: { en: "Singapore", zh: "新加坡" },
  MY: { en: "Malaysia", zh: "马来西亚" },
  HK: { en: "Hong Kong", zh: "香港" },
  CN: { en: "China", zh: "中国" },
};

export function categoryLabel(c: { slug?: string | null; name: string }, locale: Locale): string {
  if (locale === "ko" || !c.slug) return c.name;
  return CATEGORY[c.slug]?.[locale] ?? c.name;
}
export function regionLabel(r: { code?: string | null; name: string }, locale: Locale): string {
  if (locale === "ko" || !r.code) return r.name;
  return REGION[r.code]?.[locale] ?? r.name;
}
