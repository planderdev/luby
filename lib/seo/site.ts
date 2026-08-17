/**
 * Centralized SEO config — used by metadata, robots, sitemap, JSON-LD.
 * Keeps the canonical site URL consistent everywhere.
 */
export function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL)
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export const SITE = {
  name: "루비AI",
  legalName: "루비AI",
  tagline: "글로벌 체험단 마케팅 플랫폼",
  description:
    "루비AI는 글로벌 인플루언서·체험단을 AI로 매칭하는 마케팅 플랫폼입니다. 캠페인 등록부터 선정·콘텐츠 발행까지 한 곳에서.",
  shortDescription: "글로벌 인플루언서를 AI로 매칭하는 마케팅 플랫폼",
  email: "contact@plander.io",
  locale: "ko_KR",
  language: "ko",
  twitter: "",
  // markets the platform serves — for international SEO signals
  areaServed: [
    "Korea",
    "Japan",
    "United States",
    "Taiwan",
    "Thailand",
    "Vietnam",
    "Indonesia",
    "Philippines",
    "Singapore",
    "Malaysia",
    "Hong Kong",
    "China",
  ],
  keywords: [
    "루비AI",
    "루비 AI",
    "글로벌 체험단",
    "샤오홍슈 체험단",
    "샤오홍슈 마케팅",
    "Xiaohongshu",
    "RedNote",
    "小红书 体验官",
    "체험단 마케팅",
    "인플루언서 마케팅",
    "AI 인플루언서 매칭",
    "글로벌 인플루언서",
    "체험단 플랫폼",
    "K뷰티 마케팅",
    "해외 인플루언서",
    "마케팅 SaaS",
    "캠페인 자동화",
  ],
} as const;
