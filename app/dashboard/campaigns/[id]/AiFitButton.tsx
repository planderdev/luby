"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Sparkles, UserCheck } from "lucide-react";
import { aiFitApplicants } from "./ai-fit-actions";
import { selectTopApplicants } from "./actions";

/** 대기 응모자 AI 적합도 일괄 평가 버튼 (BUSINESS) */
export function AiFitButton({ campaignId, unscored, scored, remainingSlots }: { campaignId: string; unscored: number; scored: number; remainingSlots: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [n, setN] = useState(Math.max(1, Math.min(scored, remainingSlots || 1)));
  const [bulkDone, setBulkDone] = useState<number | null>(null);

  function bulkSelect() {
    setError(null);
    startTransition(async () => {
      const r = await selectTopApplicants(campaignId, n);
      if (!r.ok) setError(r.error);
      else {
        setBulkDone(r.selected);
        setBulkOpen(false);
        router.refresh();
      }
    });
  }

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
        {scored > 0 && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setBulkOpen((v) => !v)}
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-xs font-medium text-background hover:bg-foreground/90 disabled:opacity-60"
            >
              {bulkDone !== null ? <Check className="size-3.5" /> : <UserCheck className="size-3.5" />}
              {bulkDone !== null ? `${bulkDone}명 선정됨` : "상위 N명 선정"}
            </button>
            {bulkOpen && (
              <div className="absolute right-0 z-20 mt-2 w-72 rounded-2xl border border-border bg-background p-4 shadow-lg">
                <div className="text-sm font-semibold">적합도 점수순 일괄 선정</div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  평가된 대기 응모자 {scored}명 중 점수가 높은 순으로 선정합니다. 선정되면 크리에이터에게 알림이 가고 채팅이 열립니다.
                </p>
                <label className="mt-3 block text-xs text-muted-foreground">
                  선정 인원{remainingSlots > 0 ? ` (남은 모집 ${remainingSlots}명)` : ""}
                  <input
                    type="number"
                    min={1}
                    max={Math.min(100, scored)}
                    value={n}
                    onChange={(e) => setN(Math.max(1, Math.min(Math.min(100, scored), Number(e.target.value) || 1)))}
                    className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  />
                </label>
                <div className="mt-3 flex justify-end gap-2">
                  <button type="button" onClick={() => setBulkOpen(false)} className="rounded-full px-3 py-1.5 text-xs hover:bg-muted">취소</button>
                  <button type="button" onClick={bulkSelect} disabled={pending} className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-3 py-1.5 text-xs font-medium text-background disabled:opacity-60">
                    {pending && <Loader2 className="size-3 animate-spin" />} {n}명 선정
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
