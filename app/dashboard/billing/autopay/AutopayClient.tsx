"use client";

import { useState } from "react";
import Link from "next/link";
import { loadTossPayments } from "@tosspayments/tosspayments-sdk";
import { CreditCard, Loader2 } from "lucide-react";
import { trackClient } from "@/lib/analytics";
import { startBillingAuth } from "../actions";

/** 자동결제 동의 → 토스 카드 등록창. 성공하면 /dashboard/billing/autopay/success 로 돌아와 서버가 빌링키 발급·결제 */
export function AutopayClient({ cta, changing }: { cta: string; changing: boolean }) {
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    if (!agreed || busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await startBillingAuth();
      if (!r.ok) {
        setError(r.error);
        setBusy(false);
        return;
      }
      trackClient("autopay_started", { changing });
      const toss = await loadTossPayments(r.clientKey);
      await toss.payment({ customerKey: r.customerKey }).requestBillingAuth({
        method: "CARD",
        successUrl: `${window.location.origin}/dashboard/billing/autopay/success`,
        failUrl: `${window.location.origin}/dashboard/billing/fail?from=autopay`,
        customerEmail: r.customerEmail,
        customerName: r.customerName,
      });
      // 성공하면 successUrl 로 이동하므로 여기 도달하지 않음
    } catch (e) {
      const msg = e instanceof Error ? e.message : "카드 등록창을 열지 못했어요.";
      setError(msg);
      setBusy(false);
      // 진단: 토스 SDK 가 등록창을 열지 못한 이유(키 종류·계약 등)를 오류 기록에 남긴다. 사용자가 창을 닫은 경우는 제외
      const code = (e as { code?: string } | null)?.code;
      if (code !== "USER_CANCEL" && code !== "PAY_PROCESS_CANCELED") {
        void fetch("/api/errors/client", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ message: `[autopay] ${code ? `${code}: ` : ""}${msg}`.slice(0, 500), path: location.pathname }),
          keepalive: true,
        }).catch(() => {});
      }
    }
  }

  return (
    <div className="space-y-4">
      <label className="flex items-start gap-3 rounded-2xl border border-border bg-background px-5 py-4 text-sm">
        <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 size-4 shrink-0" />
        <span className="leading-relaxed">
          위 내용과{" "}
          <Link href="/terms" target="_blank" className="underline underline-offset-2">
            이용약관 제8조의2(월 구독)·제9조(환불)
          </Link>
          를 확인했고, 등록한 카드로 <b>매월 BUSINESS 이용료가 자동결제</b>되는 것에 동의합니다. 자동결제는 구독·결제 화면에서 언제든 해지할 수 있어요.
        </span>
      </label>
      {error && <div className="rounded-2xl border border-accent/30 bg-accent-soft px-4 py-3 text-sm text-accent-ink">⚠ {error}</div>}
      <button
        type="button"
        onClick={start}
        disabled={!agreed || busy}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-foreground px-7 py-4 text-sm font-semibold text-background transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : <CreditCard className="size-4" />}
        {busy ? "카드 등록창 여는 중..." : cta}
      </button>
      <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
        카드 정보는 토스페이먼츠가 보관하고 루비AI에는 카드사·마스킹된 번호만 남아요. 국내 발급 카드만 등록할 수 있어요.
      </p>
    </div>
  );
}
