/**
 * BUSINESS 가격 표시·결제 금액(2026-10-23 사장님 결정) — 화면(클라이언트 포함)과 서버가 함께 쓰는 순수 모듈.
 * - 월 구독(정기결제): 정가 list_price ₩2,000,000(부가세 별도)에 취소선 → 할인가 monthly_price ₩1,800,000/월(부가세 별도), 실제 결제 subscription_amount ₩1,980,000(부가세 포함)
 * - 단건 결제: one_time_amount ₩2,200,000(부가세 포함), 1개월
 */
export type PlanPriceRow = {
  monthly_price: number;
  list_price?: number | null;
  one_time_amount?: number | null;
  subscription_amount?: number | null;
};
export type PlanPrices = { list: number | null; monthly: number; subscription: number; oneTime: number };

export function planPrices(p: PlanPriceRow): PlanPrices {
  return {
    list: p.list_price && p.list_price > p.monthly_price ? p.list_price : null,
    monthly: p.monthly_price,
    subscription: p.subscription_amount ?? p.monthly_price,
    oneTime: p.one_time_amount ?? p.monthly_price,
  };
}

/** 결제 방식별 실제 결제 금액 — 금액 검증(위·변조 방어)의 기준 */
export function chargeAmount(p: PlanPriceRow, kind: string | null | undefined): number {
  const x = planPrices(p);
  return !kind || kind === "one_time" ? x.oneTime : x.subscription;
}

export const won = (n: number) => `₩${n.toLocaleString("ko-KR")}`;
