/** 광고주 유형 — 브랜드(직접 광고주) vs 마케팅 대행사·실행사 */
export type AdvertiserKind = "brand" | "agency";

export const ADVERTISER_KINDS: {
  value: AdvertiserKind;
  label: string;
  short: string;
  desc: string;
}[] = [
  {
    value: "brand",
    label: "브랜드 · 자영업",
    short: "브랜드",
    desc: "우리 회사·매장·제품을 직접 홍보해요",
  },
  {
    value: "agency",
    label: "마케팅 대행사 · 실행사",
    short: "대행사",
    desc: "클라이언트를 대신해 캠페인을 운영해요",
  },
];

export function advertiserKindLabel(kind: string | null | undefined): string {
  return ADVERTISER_KINDS.find((k) => k.value === kind)?.short ?? "브랜드";
}

import { authDict } from "@/lib/i18n/app/auth";
import type { Locale } from "@/lib/i18n/config";

/** 가입·온보딩 화면용 — 언어별 라벨 (대시보드 등 한국어 화면은 ADVERTISER_KINDS 그대로) */
export function advertiserKindsFor(locale: Locale): { value: AdvertiserKind; label: string; short: string; desc: string }[] {
  const d = authDict[locale].advertiserKinds;
  return (["brand", "agency"] as AdvertiserKind[]).map((value) => ({ value, ...d[value] }));
}
