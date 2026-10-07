"use client";

import { useState } from "react";
import { Link2, Check, ChevronDown } from "lucide-react";

const LANGS = [
  { code: "", locale: "ko", label: "한국어 (KR)" },
  { code: "/en", locale: "en", label: "English (EN)" },
  { code: "/zh", locale: "zh", label: "中文 (CN)" },
];

/**
 * 공개 캠페인 페이지 링크 복사 — 언어별 URL (SNS·샤오홍슈·카톡 공유용).
 * translated: 영문·중문 AI 번역이 준비된 로케일(공개 페이지·포스터가 그 언어로 보인다). 없으면 '번역 준비 중'.
 */
export function ShareLinkButton({ campaignId, refId = null, buttonLabel = "공유 링크", translated }: { campaignId: string; refId?: string | null; buttonLabel?: string; translated?: string[] }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  async function copy(prefix: string) {
    const url = `${window.location.origin}${prefix}/c/${campaignId}${refId ? `?ref=${refId}` : "?src=link"}`;
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
        <Link2 className="size-3.5" /> {buttonLabel} <ChevronDown className="size-3" />
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
              <span className="flex items-center gap-1.5">
                {l.label}
                {translated && l.locale !== "ko" && (
                  translated.includes(l.locale)
                    ? <span className="rounded-full bg-success-soft px-1.5 py-px text-[10px] font-medium text-success">번역됨</span>
                    : <span className="rounded-full bg-muted px-1.5 py-px text-[10px] text-muted-foreground">번역 준비 중</span>
                )}
              </span>
              {copied === l.code ? <Check className="size-3.5 text-success" /> : <span className="text-[10px] text-muted-foreground">복사</span>}
            </button>
          ))}
          {!refId && (
            <a href={`/dashboard/campaigns/${campaignId}/poster`} className="mt-1 flex w-full items-center justify-between rounded-xl border-t border-border px-3 py-2 text-left text-xs hover:bg-muted">
              매장용 QR 포스터 <span className="text-[10px] text-muted-foreground">A4 인쇄</span>
            </a>
          )}
          <p className="px-3 pb-1 pt-1.5 text-[10px] text-muted-foreground">
            {refId ? "내 링크로 가입한 친구가 첫 체험을 완료하면 500P (월 5명)" : "샤오홍슈·해외 SNS엔 CN/EN 링크를 쓰세요 — 제목·미션이 그 언어로 번역돼 보여요"}
          </p>
        </div>
      )}
    </div>
  );
}
