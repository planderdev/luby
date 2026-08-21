"use client";

import { useState, useTransition } from "react";
import { Check, Copy, ExternalLink, FileBarChart, Loader2, Sparkles } from "lucide-react";
import { setReportSharing } from "./actions";
import { generateReportSummary } from "./ai-report-actions";
import type { ReportSummary } from "@/lib/ai/report-summary";

/** 성과 리포트 공유 — 토큰 링크 발급·복사·끄기 (캠페인 소유자 전용) */
export function ReportShareButton({
  campaignId,
  initialToken,
  siteUrl,
  initialSummary,
  initialSummaryAt,
}: {
  campaignId: string;
  initialToken: string | null;
  siteUrl: string;
  initialSummary: ReportSummary | null;
  initialSummaryAt: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState<string | null>(initialToken);
  const [summary, setSummary] = useState<ReportSummary | null>(initialSummary);
  const [summaryAt, setSummaryAt] = useState<string | null>(initialSummaryAt);
  const [aiPending, startAi] = useTransition();
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

  function runSummary() {
    setError(null);
    startAi(async () => {
      const r = await generateReportSummary(campaignId);
      if (!r.ok) setError(r.error);
      else {
        setSummary(r.summary);
        setSummaryAt(r.generatedAt);
      }
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
          {/* AI 요약 */}
          <div className="mt-4 border-t border-border pt-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                <Sparkles className="size-3.5 text-accent-ink" /> AI 요약
              </div>
              <button
                type="button"
                onClick={runSummary}
                disabled={aiPending}
                className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-[11px] font-medium hover:bg-muted disabled:opacity-60"
              >
                {aiPending ? <Loader2 className="size-3 animate-spin" /> : null}
                {aiPending ? "작성 중…" : summary ? "다시 생성" : "요약 생성"}
              </button>
            </div>
            {summary ? (
              <div className="mt-2 rounded-xl bg-muted/40 px-3 py-2.5">
                <div className="text-xs font-semibold">{summary.headline}</div>
                <p className="mt-1 line-clamp-3 text-[11px] leading-relaxed text-muted-foreground">{summary.summary}</p>
                {summaryAt && <div className="mt-1.5 text-[10px] text-muted-foreground">{new Date(summaryAt).toLocaleString("ko-KR")} 생성 · 리포트 상단에 표시됩니다</div>}
              </div>
            ) : (
              <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                집계를 바탕으로 보고서 상단 요약(결과 한 줄·해석·다음 제안)을 AI가 작성합니다. BUSINESS 플랜부터.
              </p>
            )}
          </div>
          {error && <p className="mt-2 text-xs text-danger">{error}</p>}
        </div>
      )}
    </div>
  );
}
