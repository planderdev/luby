"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2, Check } from "lucide-react";
import { requestTaxInvoice } from "./actions";

export function TaxInvoiceButton({ paymentId, requestedAt, issuedAt }: { paymentId: string; requestedAt: string | null; issuedAt: string | null }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  if (issuedAt) return <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-1 text-[11px] font-medium text-success"><Check className="size-3" /> 세금계산서 발행됨</span>;
  if (requestedAt) return <span className="rounded-full bg-warning-soft px-2.5 py-1 text-[11px] font-medium text-warning">세금계산서 발행 요청됨</span>;
  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(async () => { const r = await requestTaxInvoice(paymentId); if (!r.ok) setError(r.error); else router.refresh(); })}
        className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[11px] hover:bg-muted disabled:opacity-50"
        title="카드 결제는 매출전표가 증빙이 되므로 필요한 경우에만 요청하세요"
      >
        {pending ? <Loader2 className="size-3 animate-spin" /> : <FileText className="size-3" />} 세금계산서 요청
      </button>
      {error && <span className="text-[11px] text-danger">{error}</span>}
    </div>
  );
}
