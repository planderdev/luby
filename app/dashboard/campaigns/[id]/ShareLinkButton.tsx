"use client";

import { useState } from "react";
import { Link2, Check, ChevronDown } from "lucide-react";

const LANGS = [
  { code: "", label: "한국어 (KR)" },
  { code: "/en", label: "English (EN)" },
  { code: "/zh", label: "中文 (CN)" },
];

/** 공개 캠페인 페이지 링크 복사 — 언어별 URL (SNS·샤오홍슈·카톡 공유용) */
export function ShareLinkButton({ campaignId }: { campaignId: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  async function copy(prefix: string) {
    const url = `${window.location.origin}${prefix}/c/${campaignId}`;
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
    setCopied(prefix);
    setTimeout(() => {
      setCopied(null);
      setOpen(false);
    }, 1200);
  }
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-medium hover:bg-muted"
        title="로그인 없이 볼 수 있는 공개 페이지 링크를 언어별로 복사해요"
      >
        <Link2 className="size-3.5" /> 공유 링크 <ChevronDown className="size-3" />
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-48 rounded-2xl border border-border bg-background p-1.5 shadow-lg">
          {LANGS.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => copy(l.code)}
              className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs hover:bg-muted"
            >
              {l.label}
              {copied === l.code ? <Check className="size-3.5 text-success" /> : <span className="text-[10px] text-muted-foreground">복사</span>}
            </button>
          ))}
          <p className="px-3 pb-1 pt-1.5 text-[10px] text-muted-foreground">샤오홍슈·해외 SNS엔 CN/EN 링크를 쓰세요</p>
        </div>
      )}
    </div>
  );
}
