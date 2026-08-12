"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, X } from "lucide-react";
import { processWithdrawal } from "../actions";

const STATUS_LABEL: Record<string, { label: string; tone: string }> = {
  requested: { label: "처리 대기", tone: "bg-accent-soft text-accent-ink" },
  paid: { label: "지급 완료", tone: "bg-foreground text-background" },
  rejected: { label: "반려", tone: "bg-muted text-muted-foreground" },
};

export function WithdrawalRow({
  id,
  influencerName,
  influencerEmail,
  amount,
  bankName,
  accountNumber,
  accountHolder,
  status,
  rejectReason,
  requestedAt,
}: {
  id: string;
  influencerName: string;
  influencerEmail: string;
  amount: number;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  status: string;
  rejectReason: string | null;
  requestedAt: string;
}) {
  const [currentStatus, setCurrentStatus] = useState(status);
  const [currentReason, setCurrentReason] = useState(rejectReason);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function decide(approve: boolean) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await processWithdrawal(id, approve, approve ? undefined : reason);
        if (result.ok) {
          setCurrentStatus(approve ? "paid" : "rejected");
          if (!approve) setCurrentReason(reason.trim() || null);
          setRejectOpen(false);
        } else {
          setError(result.error);
        }
      } catch {
        setError("처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
      }
    });
  }

  const info = STATUS_LABEL[currentStatus] ?? STATUS_LABEL.requested;

  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">{amount.toLocaleString()}P</span>
            <span className="text-xs text-muted-foreground">
              {influencerName} ({influencerEmail})
            </span>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {bankName} · {accountNumber} · 예금주 {accountHolder}
          </div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">
            신청일 {new Date(requestedAt).toLocaleString("ko-KR")}
          </div>
          {currentStatus === "rejected" && currentReason && (
            <div className="mt-1 text-xs text-accent-ink">반려 사유: {currentReason}</div>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className={`rounded-full px-3 py-1 text-[11px] font-medium ${info.tone}`}>
            {info.label}
          </span>
          {currentStatus === "requested" && !rejectOpen && (
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setRejectOpen(true)}
                disabled={pending}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3.5 py-2 text-xs font-medium hover:bg-muted disabled:opacity-50"
              >
                <X className="size-3.5" />
                반려
              </button>
              <button
                type="button"
                onClick={() => decide(true)}
                disabled={pending}
                className="inline-flex items-center gap-1 rounded-full bg-foreground px-3.5 py-2 text-xs font-medium text-background hover:bg-foreground/90 disabled:opacity-50"
              >
                {pending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Check className="size-3.5" />
                )}
                지급 완료
              </button>
            </div>
          )}
        </div>
      </div>

      {currentStatus === "requested" && rejectOpen && (
        <div className="mt-3">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="반려 사유를 입력해주세요. 인플루언서에게 표시되며 포인트는 자동 환불됩니다."
            className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none focus:border-foreground"
          />
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setRejectOpen(false);
                setError(null);
              }}
              disabled={pending}
              className="rounded-full border border-border bg-background px-4 py-2 text-xs font-medium hover:bg-muted disabled:opacity-50"
            >
              취소
            </button>
            <button
              type="button"
              onClick={() => decide(false)}
              disabled={pending || !reason.trim()}
              className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-xs font-medium text-background hover:bg-foreground/90 disabled:opacity-50"
            >
              {pending ? <Loader2 className="size-3.5 animate-spin" /> : null}
              반려 확정 (포인트 환불)
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-2 rounded-xl border border-accent/30 bg-accent-soft px-3 py-2 text-xs text-accent-ink">
          {error}
        </div>
      )}
    </div>
  );
}
