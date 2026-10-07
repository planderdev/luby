"use client";

import { useState, useTransition } from "react";
import { Banknote, Loader2 } from "lucide-react";
import { requestWithdrawal } from "./actions";
import { dashboardDict } from "@/lib/i18n/app/dashboard";
import type { Locale } from "@/lib/i18n/config";

export function WithdrawalForm({ balance, locale = "ko" }: { balance: number; locale?: Locale }) {
  const t = dashboardDict[locale].points.form;
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
        }, locale);
        if (result.ok) {
          setDone(true);
          setAmount("");
        } else {
          setError(result.error);
        }
      } catch {
        setError(t.errGeneric);
      }
    });
  }

  return (
    <div className="rounded-3xl glass-card p-6">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {t.title}
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">
        {t.desc}
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-[11px] font-medium text-muted-foreground">
            {t.amount}
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
          <label className="block text-[11px] font-medium text-muted-foreground">{t.bank}</label>
          <input
            type="text"
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            placeholder={t.bankPh}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-muted-foreground">{t.account}</label>
          <input
            type="text"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            placeholder={t.accountPh}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-muted-foreground">{t.holder}</label>
          <input
            type="text"
            value={accountHolder}
            onChange={(e) => setAccountHolder(e.target.value)}
            placeholder={t.holderPh}
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
          {t.done}
        </div>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={pending || !canSubmit}
        className="mt-4 inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background hover:bg-foreground/90 disabled:opacity-50"
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Banknote className="size-4" />}
        {t.submit}
      </button>
    </div>
  );
}
