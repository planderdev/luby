"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileCheck2, Loader2 } from "lucide-react";
import { markTaxInvoiceIssued } from "../actions";

export function TaxInvoiceAction({ paymentId, requestedAt, issuedAt, taxEmail }: { paymentId: string; requestedAt: string | null; issuedAt: string | null; taxEmail: string | null }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  if (issuedAt) return <span className="rounded-full bg-success-soft px-2.5 py-1 text-[11px] font-medium text-success">세금계산서 발행 완료 {new Date(issuedAt).toLocaleDateString("ko-KR")}</span>;
  return (
    <div className="flex flex-col items-end gap-1">
      {requestedAt ? (
        <span className="rounded-full bg-warning-soft px-2.5 py-1 text-[11px] font-medium text-warning">세금계산서 요청 {new Date(requestedAt).toLocaleDateString("ko-KR")}</span>
      ) : null}
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-[11px] hover:bg-muted">
          <FileCheck2 className="size-3" /> 발행 완료 처리
        </button>
      ) : (
        <div className="flex flex-col items-end gap-1 rounded-2xl border border-border bg-background p-2 text-[11px]">
          <div className="text-muted-foreground">수신: {taxEmail ?? "담당자 이메일"}</div>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="메모 (예: 홈택스 승인번호)" className="w-56 rounded-full border border-border px-3 py-1 outline-none" />
          <div className="flex gap-1">
            <button type="button" onClick={() => setOpen(false)} className="rounded-full px-2 py-1 hover:bg-muted">닫기</button>
            <button type="button" disabled={pending} onClick={() => startTransition(async () => { const r = await markTaxInvoiceIssued(paymentId, note); if (!r.ok) setError(r.error); else { setOpen(false); router.refresh(); } })} className="inline-flex items-center gap-1 rounded-full bg-foreground px-3 py-1 font-medium text-background disabled:opacity-50">
              {pending && <Loader2 className="size-3 animate-spin" />} 완료
            </button>
          </div>
          {error && <span className="text-danger">{error}</span>}
        </div>
      )}
    </div>
  );
}
