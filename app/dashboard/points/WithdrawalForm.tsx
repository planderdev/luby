"use client";

import { useState, useTransition } from "react";
import { Banknote, Loader2 } from "lucide-react";
import { requestWithdrawal } from "./actions";

export function WithdrawalForm({ balance }: { balance: number }) {
  const [amount, setAmount] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  const canSubmit =
    Number(amount) >= 10000 &&
    bankName.trim() &&
    accountNumber.trim() &&
    accountHolder.trim();

  function submit() {
    setError(null);
    setDone(false);
    startTransition(async () => {
      try {
        const result = await requestWithdrawal({
          amount: Number(amount),
          bankName,
          accountNumber,
          accountHolder,
        });
        if (result.ok) {
          setDone(true);
          setAmount("");
        } else {
          setError(result.error);
        }
      } catch {
        setError("출금 신청 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
      }
    });
  }

  return (
    <div className="rounded-3xl border border-border bg-background p-6">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        출금 신청
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">
        최소 10,000P부터 출금할 수 있습니다. 1P = 1원, 영업일 기준 3일 이내 지급됩니다.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-[11px] font-medium text-muted-foreground">
            출금 금액 (P)
          </label>
          <input
            type="number"
            min={10000}
            max={balance}
            step={1000}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="10000"
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-muted-foreground">은행명</label>
          <input
            type="text"
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            placeholder="예: 국민은행"
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-muted-foreground">계좌번호</label>
          <input
            type="text"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            placeholder="숫자와 - 만 입력"
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-muted-foreground">예금주</label>
          <input
            type="text"
            value={accountHolder}
            onChange={(e) => setAccountHolder(e.target.value)}
            placeholder="본인 명의 계좌만 가능"
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
          />
        </div>
      </div>

      {error && (
        <div className="mt-3 rounded-xl border border-accent/30 bg-accent-soft px-3 py-2 text-xs text-accent-ink">
          {error}
        </div>
      )}
      {done && (
        <div className="mt-3 rounded-xl bg-accent-soft px-3 py-2 text-xs text-accent-ink">
          출금 신청이 접수되었습니다. 신청 금액만큼 포인트가 차감되며, 반려 시 환불됩니다.
        </div>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={pending || !canSubmit}
        className="mt-4 inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background hover:bg-foreground/90 disabled:opacity-50"
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Banknote className="size-4" />}
        출금 신청하기
      </button>
    </div>
  );
}
