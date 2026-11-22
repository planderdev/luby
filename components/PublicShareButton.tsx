"use client";

import { ShareMenu } from "@/components/share/ShareMenu";

/** 공개 페이지 공유 버튼 — 링크 복사 · SNS 바로 보내기 · (지원 기기) 기기 공유창 */
export function PublicShareButton({ title, path, label = "공유하기", locale = "ko" }: { title: string; path: string; label?: string; locale?: "ko" | "en" | "zh" }) {
  return <ShareMenu title={title} links={[{ code: "self", label, path }]} label={label} uiLocale={locale} align="left" />;
}
