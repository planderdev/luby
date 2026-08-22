"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { aiFitApplicants } from "./ai-fit-actions";

/** 대기 응모자 AI 적합도 일괄 평가 버튼 (BUSINESS) */
export function AiFitButton({ campaignId, unscored, scored }: { campaignId: string; unscored: number; scored: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(force: boolean) {
    setError(null);
    startTransition(async () => {
      const r = await aiFitApplicants(campaignId, force);
      if (!r.ok) setError(r.error);
      else router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1.5">
        {unscored > 0 ? (
          <button
            type="button"
            onClick={() => run(false)}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent-soft px-4 py-2 text-xs font-medium text-accent-ink hover:bg-accent-soft/70 disabled:opacity-60"
          >
            {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
            {pending ? "평가 중…" : `AI 적합도 평가 (${Math.min(unscored, 30)}명)`}
          </button>
        ) : scored > 0 ? (
          <button
            type="button"
            onClick={() => run(true)}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-2 text-xs font-medium hover:bg-muted disabled:opacity-60"
            title="대기 응모자 전체를 다시 평가합니다"
          >
            {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
            {pending ? "평가 중…" : "AI 적합도 다시 평가"}
          </button>
        ) : null}
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
