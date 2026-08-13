"use client";

import { useEffect, useRef, useState } from "react";
import { loadTossPayments, type TossPaymentsWidgets } from "@tosspayments/tosspayments-sdk";
import { Loader2, Lock } from "lucide-react";
import { createBusinessOrder } from "../actions";

type OrderInfo = {
  orderId: string;
  orderName: string;
  amount: number;
  customerKey: string;
  customerEmail: string;
  customerName: string;
};

export function CheckoutClient({ clientKey }: { clientKey: string }) {
  const [order, setOrder] = useState<OrderInfo | null>(null);
  const [widgetsReady, setWidgetsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const widgetsRef = useRef<TossPaymentsWidgets | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    // React StrictMode의 이중 마운트에서 주문이 2번 생성되지 않도록 가드
    if (initialized.current) return;
    initialized.current = true;

    (async () => {
      try {
        // 1. 서버에서 주문 생성 (금액은 서버가 결정)
        const result = await createBusinessOrder();
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setOrder(result);

        // 2. 위젯 로드 + 렌더
        const tossPayments = await loadTossPayments(clientKey);
        const widgets = tossPayments.widgets({ customerKey: result.customerKey });
        widgetsRef.current = widgets;

        await widgets.setAmount({ currency: "KRW", value: result.amount });
        await Promise.all([
          widgets.renderPaymentMethods({
            selector: "#toss-payment-methods",
            variantKey: "DEFAULT",
          }),
          widgets.renderAgreement({
            selector: "#toss-agreement",
            variantKey: "AGREEMENT",
          }),
        ]);
        setWidgetsReady(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "결제 모듈 로드에 실패했습니다.");
      }
    })();
  }, [clientKey]);

  async function pay() {
    if (!widgetsRef.current || !order) return;
    setPaying(true);
    setError(null);
    try {
      await widgetsRef.current.requestPayment({
        orderId: order.orderId,
        orderName: order.orderName,
        successUrl: `${window.location.origin}/dashboard/billing/success`,
        failUrl: `${window.location.origin}/dashboard/billing/fail`,
        customerEmail: order.customerEmail,
        customerName: order.customerName,
      });
      // 성공 시 successUrl로 리다이렉트되므로 여기 도달하지 않음
    } catch (e) {
      // 사용자가 결제창을 닫은 경우 등
      const msg = e instanceof Error ? e.message : "결제가 취소되었습니다.";
      setError(msg);
      setPaying(false);
    }
  }

  if (error && !order) {
    return (
      <div className="rounded-3xl border border-accent/30 bg-accent-soft/50 p-6 text-sm text-accent-ink">
        ⚠ {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 주문 요약 */}
      {order && (
        <div className="flex items-center justify-between rounded-3xl glass-card px-6 py-4">
          <div>
            <div className="text-sm font-medium">{order.orderName}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              주문번호 {order.orderId.slice(0, 18)}…
            </div>
          </div>
          <div className="display text-xl font-semibold">
            ₩{order.amount.toLocaleString()}
          </div>
        </div>
      )}

      {/* 토스 위젯 영역 */}
      <div className="overflow-hidden rounded-3xl glass-card">
        {!widgetsReady && (
          <div className="flex items-center justify-center gap-2 px-6 py-16 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            결제 수단 불러오는 중...
          </div>
        )}
        <div id="toss-payment-methods" />
        <div id="toss-agreement" />
      </div>

      {error && order && (
        <div className="rounded-2xl border border-accent/30 bg-accent-soft px-4 py-3 text-sm text-accent-ink">
          ⚠ {error}
        </div>
      )}

      <button
        type="button"
        onClick={pay}
        disabled={!widgetsReady || paying}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-foreground px-7 py-4 text-sm font-semibold text-background transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {paying ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
        {paying ? "결제 진행 중..." : order ? `₩${order.amount.toLocaleString()} 결제하기` : "준비 중..."}
      </button>

      <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
        결제는 토스페이먼츠를 통해 안전하게 처리됩니다.
        <br />
        결제 완료 즉시 BUSINESS 플랜이 30일간 적용됩니다.
      </p>
    </div>
  );
}
