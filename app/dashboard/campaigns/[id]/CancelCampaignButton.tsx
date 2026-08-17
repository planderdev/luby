"use client";

import { useState, useTransition } from "react";
import { Ban, Loader2 } from "lucide-react";
import { cancelCampaign } from "./actions";

export function CancelCampaignButton({ campaignId, applicantCount }: { campaignId: string; applicantCount: number }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function confirm() {
    setError(null);
    startTransition(async () => {
      const r = await cancelCampaign(campaignId);
      if (!r.ok) setError(r.error);
      else setOpen(false);
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <Ban className="size-3.5" /> 캠페인 취소
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-80 rounded-2xl border border-border bg-background p-4 shadow-lg">
          <div className="text-sm font-semibold">정말 취소할까요?</div>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            취소하면 모집이 즉시 중단되고{applicantCount > 0 ? ` 응모자 ${applicantCount}명에게 취소 알림이 발송됩니다` : " 크리에이터에게 더 이상 노출되지 않습니다"}. 캠페인 기록은 보존되며 되돌릴 수 없습니다.
          </p>
          {error && <p className="mt-2 text-xs text-danger">{error}</p>}
          <div className="mt-3 flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="rounded-full px-3 py-1.5 text-xs hover:bg-muted">
              닫기
            </button>
            <button
              type="button"
              onClick={confirm}
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-full bg-danger px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
            >
              {pending && <Loader2 className="size-3 animate-spin" />} 취소 확정
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
