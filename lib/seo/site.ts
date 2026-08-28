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
  tagline: "체험단 모집·글로벌 인플루언서 마케팅 플랫폼",
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
  // 홍보 키워드 — ① 브랜드 ② 광고주 수요(체험단 모집·인플루언서 마케팅)
  // ③ 차별화 니치(샤오홍슈·외국인 관광객: 경쟁이 낮고 우리만 하는 것) ④ 크리에이터 공급(체험단 신청)
  // keywords 메타는 네이버용 참고 신호 — 실제 노출은 제목·설명 문구가 좌우하므로 거기에도 같은 키워드를 심는다
  keywords: [
    "루비AI",
    "루비 AI",
    "체험단 모집",
    "체험단 플랫폼",
    "체험단 모집 사이트",
    "인플루언서 마케팅",
    "인플루언서 마케팅 플랫폼",
    "글로벌 체험단",
    "외국인 인플루언서 마케팅",
    "샤오홍슈 체험단",
    "샤오홍슈 마케팅",
    "중국 관광객 마케팅",
    "외국인 관광객 마케팅",
    "K뷰티 마케팅",
    "체험단 신청",
    "체험단 사이트",
    "인플루언서 협찬",
    "AI 인플루언서 매칭",
    "Xiaohongshu marketing",
    "influencer marketing platform Korea",
    "K-beauty influencer campaign",
    "小红书 体验官",
    "韩国探店",
    "韩国品牌合作",
  ],
} as const;
