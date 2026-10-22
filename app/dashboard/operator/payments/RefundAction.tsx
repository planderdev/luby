"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Undo2 } from "lucide-react";
import { refundPaymentAction } from "../actions";

/** 총운영관리자 전용 — 결제 전액 환불(토스 취소). 되돌릴 수 없어 확인 창을 한 번 더 띄운다 */
export function RefundAction({ paymentId, amount, taxIssued, virtualAccount }: { paymentId: string; amount: number; taxIssued: boolean; virtualAccount: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [downgrade, setDowngrade] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const won = `₩${amount.toLocaleString()}`;

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-[11px] hover:bg-muted">
        <Undo2 className="size-3" /> 환불
      </button>
    );
  }
  return (
    <div className="flex w-64 flex-col items-stretch gap-1.5 rounded-2xl border border-border bg-background p-2.5 text-left text-[11px]">
      <div className="font-medium">{won} 전액 환불</div>
      {virtualAccount && <div className="text-accent-ink">가상계좌 결제는 환불 계좌가 필요해 여기서 환불할 수 없어요. 토스 상점관리자에서 처리해 주세요.</div>}
      {taxIssued && <div className="text-accent-ink">세금계산서가 이미 발행됐어요. 환불 후 홈택스에서 수정세금계산서(계약의 해제)를 발행해 주세요.</div>}
      <input value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} placeholder="환불 사유(필수) — 광고주 알림에는 안 보여요" aria-label="환불 사유" className="rounded-full border border-border px-3 py-1 outline-none" />
      <label className="flex items-center gap-1.5 text-muted-foreground">
        <input type="checkbox" checked={downgrade} onChange={(e) => setDowngrade(e.target.checked)} className="size-3" />
        플랜도 바로 FREE로 전환(정기결제 해지)
      </label>
      <div className="flex justify-end gap-1">
        <button type="button" onClick={() => { setOpen(false); setError(null); }} className="rounded-full px-2 py-1 hover:bg-muted">닫기</button>
        <button
          type="button"
          disabled={pending || reason.trim().length < 2 || virtualAccount}
          onClick={() => {
            if (!window.confirm(`${won}을 전액 환불할까요? 토스에서 결제가 취소되고 되돌릴 수 없어요.${downgrade ? "\n플랜도 FREE로 바뀌어요." : ""}`)) return;
            setError(null);
            startTransition(async () => {
              const r = await refundPaymentAction(paymentId, { reason, downgrade });
              if (!r.ok) setError(r.error);
              else { setOpen(false); router.refresh(); }
            });
          }}
          className="inline-flex items-center gap-1 rounded-full bg-foreground px-3 py-1 font-medium text-background disabled:opacity-50"
        >
          {pending && <Loader2 className="size-3 animate-spin" />} 환불하기
        </button>
      </div>
      {error && <span className="text-danger">{error}</span>}
    </div>
  );
}
