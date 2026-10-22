import { Check } from "lucide-react";
import { won, type PlanPrices } from "@/lib/payments/prices";

/** 월 구독(정기결제) 이용 조건 — 결제 방식 선택과 정기결제 카드 페이지 공용. 정가 취소선 + 할인가(부가세 별도) + 실제 결제 금액 */
export function AutopayTerms({ planName, prices }: { planName: string; prices: PlanPrices }) {
  return (
    <div className="rounded-3xl glass-card px-6 py-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="text-sm font-medium">
          {planName} 플랜 · 매월 자동결제
          {prices.list && <span className="ml-2 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent-ink">할인 중</span>}
        </div>
        <div className="text-right">
          {prices.list && <div className="text-xs text-muted-foreground line-through tabular-nums">{won(prices.list)}</div>}
          <div className="display text-xl font-semibold tabular-nums">
            {won(prices.monthly)}
            <span className="text-xs font-normal text-muted-foreground"> / 월</span>
          </div>
          <div className="text-[11px] text-muted-foreground">부가세 별도 · 결제 금액 {won(prices.subscription)}</div>
        </div>
      </div>
      <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
        {[
          "만료 하루 전 오전 10시에 등록 카드로 결제하고, 성공하면 기존 만료일에 이어서 30일이 연장돼요.",
          "결제 3일 전에 '자동결제 예정' 알림을 보내 드려요.",
          "결제가 실패하면 만료 후 3일 동안 BUSINESS를 유지하며 매일 다시 시도해요. 그 안에 카드를 바꾸면 바로 결제돼요.",
          "해지하면 남은 기간까지 이용하고 더는 결제되지 않아요. 결제 후 환불은 고객센터로 문의해 주세요.",
        ].map((t) => (
          <li key={t} className="flex items-start gap-2">
            <Check className="mt-0.5 size-4 shrink-0 text-accent-ink" strokeWidth={2.5} />
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
