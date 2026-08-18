"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";

/** 공개 페이지 공유 버튼 — 모바일은 OS 공유 시트(navigator.share), 데스크톱은 링크 복사 */
export function PublicShareButton({ title, path, label = "공유하기", copiedLabel = "링크 복사됨" }: { title: string; path: string; label?: string; copiedLabel?: string }) {
  const [copied, setCopied] = useState(false);
  async function share() {
    const url = `${window.location.origin}${path}`;
    const nav = navigator as Navigator & { share?: (d: { title: string; url: string }) => Promise<void> };
    if (typeof nav.share === "function") {
      try {
        await nav.share({ title, url });
        return;
      } catch {
        /* 사용자가 닫음 → 복사로 폴백하지 않음 */
        return;
      }
    }
    try {
      await nav.clipboard.writeText(url);
    } catch {
      /* noop */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }
  return (
    <button
      type="button"
      onClick={share}
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-2 text-xs font-medium hover:bg-muted"
    >
      {copied ? <Check className="size-3.5 text-success" /> : <Share2 className="size-3.5" />}
      {copied ? copiedLabel : label}
    </button>
  );
}
