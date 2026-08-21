"use client";

import { useState, useTransition } from "react";
import { Check, Copy, ExternalLink, FileBarChart, Loader2 } from "lucide-react";
import { setReportSharing } from "./actions";

/** 성과 리포트 공유 — 토큰 링크 발급·복사·끄기 (캠페인 소유자 전용) */
export function ReportShareButton({
  campaignId,
  initialToken,
  siteUrl,
}: {
  campaignId: string;
  initialToken: string | null;
  siteUrl: string;
}) {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState<string | null>(initialToken);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const url = token ? `${siteUrl}/r/${token}` : null;

  function toggle(on: boolean) {
    setError(null);
    startTransition(async () => {
      const r = await setReportSharing(campaignId, on);
      if (!r.ok) setError(r.error);
      else setToken(r.token);
    });
  }

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("복사에 실패했습니다. 링크를 직접 선택해 복사해주세요.");
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-medium transition-colors ${
          token ? "border-accent/40 bg-accent-soft text-accent-ink" : "border-border bg-background hover:bg-muted"
        }`}
      >
        <FileBarChart className="size-3.5" /> 리포트 공유{token ? " 중" : ""}
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-[22rem] rounded-2xl border border-border bg-background p-4 shadow-lg">
          <div className="text-sm font-semibold">성과 리포트 링크</div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            클라이언트·팀에게 로그인 없이 보여줄 수 있는 보고서 페이지입니다. 크리에이터 연락처·정산 정보는 포함되지 않습니다.
          </p>
          {url ? (
            <>
              <div className="mt-3 flex items-center gap-1.5">
                <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} className="min-w-0 flex-1 rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs" />
                <button type="button" onClick={copy} aria-label="링크 복사" className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl border border-border hover:bg-muted">
                  {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
                </button>
                <a href={url} target="_blank" rel="noreferrer" aria-label="새 탭에서 열기" className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl border border-border hover:bg-muted">
                  <ExternalLink className="size-4" />
                </a>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">리포트는 열 때마다 최신 수치로 생성됩니다.</span>
                <button type="button" onClick={() => toggle(false)} disabled={pending} className="inline-flex items-center gap-1 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground disabled:opacity-60">
                  {pending && <Loader2 className="size-3 animate-spin" />} 공유 끄기
                </button>
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={() => toggle(true)}
              disabled={pending}
              className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-foreground px-4 py-2.5 text-xs font-medium text-background disabled:opacity-60"
            >
              {pending && <Loader2 className="size-3.5 animate-spin" />} 공유 링크 만들기
            </button>
          )}
          {error && <p className="mt-2 text-xs text-danger">{error}</p>}
        </div>
      )}
    </div>
  );
}
