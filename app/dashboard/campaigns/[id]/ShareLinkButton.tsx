"use client";

import { useState } from "react";
import { Link2, Check } from "lucide-react";

/** 공개 캠페인 페이지(/c/[id]) 링크 복사 — SNS·샤오홍슈·카톡 공유용 */
export function ShareLinkButton({ campaignId }: { campaignId: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    const url = `${window.location.origin}/c/${campaignId}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-medium hover:bg-muted"
      title="로그인 없이 볼 수 있는 공개 페이지 링크를 복사해요"
    >
      {copied ? <Check className="size-3.5 text-success" /> : <Link2 className="size-3.5" />}
      {copied ? "복사됨" : "공유 링크"}
    </button>
  );
}
