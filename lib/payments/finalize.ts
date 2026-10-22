/**
 * 결제 확정 — 토스 승인 결과(또는 토스 조회 결과)를 우리 주문·구독에 반영하는 순수 로직.
 *
 * - 승인 응답이 성공이면 그 결제 객체를, 이미 처리됨(ALREADY_PROCESSED_PAYMENT)·응답 유실·토스 5xx 면
 *   결제 키로 토스에 다시 물어본 결제 객체를 기준으로 맞춘다(주문번호가 다르면 반영 안 함) — 새로고침·동시 요청·웹훅 모두 같은 경로.
 * - 결제 확정 + 구독 연장은 DB 함수(finalize_paid_payment) 한 번으로: 같은 결제가 여러 번 들어와도
 *   구독은 정확히 한 번만 늘어나고, 이미 결제 완료인 주문을 '실패'로 덮어쓰지 않는다.
 * - 금액은 주문 행이 아니라 플랜의 결제 방식별 금액과 대조(주문 행은 광고주가 직접 넣을 수 있음) — 단건 one_time_amount, 정기 subscription_amount.
 */
import type { TossConfirmResult, TossPayment } from "./toss";
import { dbErrorMessage } from "@/lib/db-errors";
import { chargeAmount, type PlanPriceRow } from "./prices";

export const SUBSCRIPTION_DAYS = 30;

export type PaymentOrder = {
  id: string;
  order_id: string;
  plan_id: string;
  status: string;
  advertiser_id: string;
  /** one_time(단건) | billing_first | billing_renewal(정기결제) — 결제 금액 기준이 다르다 */
  kind?: string | null;
};
export type PaymentPlan = { id: string; name: string } & PlanPriceRow;
export type DepositInfo = { bank: string; accountNumber: string; dueDate: string | null; amount: number };

export type FinalizeResult =
  | { status: "paid"; alreadyPaid: boolean; planName: string; expiresAt: string }
  | { status: "waiting"; planName: string; deposit: DepositInfo | null }
  /** retryable: 토스·DB 일시 오류 — 같은 요청을 다시 하면 맞춰질 수 있음(웹훅은 500 으로 재시도 유도) */
  | { status: "error"; error: string; retryable?: boolean };

export type FinalizeDeps = {
  plan: (planId: string) => Promise<PaymentPlan | null>;
  confirm: (p: { paymentKey: string; orderId: string; amount: number }) => Promise<TossConfirmResult>;
  lookup: (paymentKey: string) => Promise<TossConfirmResult>;
  /** ready·failed → paid + 구독 연장(한 트랜잭션). 이번 호출이 바꿨으면 transitioned=true */
  markPaid: (
    orderRowId: string,
    payment: TossPayment,
  ) => Promise<{ transitioned: boolean; expiresAt: string | null } | { error: string }>;
  /** ready 인 행만 failed 로 — 이미 paid 인 행은 건드리지 않는다 */
  markFailed: (orderRowId: string, fields: { paymentKey: string | null; reason: string; raw?: TossPayment }) => Promise<void>;
  /** 가상계좌 입금 대기 — 상태는 ready 그대로 두고 결제 키·계좌 정보만 기록 */
  markWaiting: (orderRowId: string, payment: TossPayment) => Promise<void>;
  currentExpiry: (advertiserId: string) => Promise<string | null>;
};

const err = (error: string, retryable = false): FinalizeResult => ({ status: "error", error, ...(retryable ? { retryable } : {}) });
const transient = (r: { status: number }) => r.status === 0 || r.status >= 500;

const CLOSED_MESSAGES: Record<string, string> = {
  CANCELED: "결제가 취소되었어요.",
  PARTIAL_CANCELED: "결제가 부분 취소되었어요. 고객센터로 문의해 주세요.",
  ABORTED: "결제 승인에 실패했어요. 카드 정보를 확인하거나 다른 결제 수단으로 다시 시도해 주세요.",
  EXPIRED: "결제 유효 시간이 지났어요. 다시 결제해 주세요.",
};

// 금융결제원 은행 코드(토스 virtualAccount.bankCode)
const BANKS: Record<string, string> = {
  "02": "KDB산업", "03": "IBK기업", "06": "KB국민", "07": "수협", "11": "NH농협", "12": "단위농협",
  "20": "우리", "23": "SC제일", "27": "씨티", "31": "iM뱅크(대구)", "32": "부산", "34": "광주",
  "35": "제주", "37": "전북", "39": "경남", "45": "새마을금고", "48": "신협", "50": "저축은행",
  "54": "HSBC", "64": "산림조합", "71": "우체국", "81": "하나", "88": "신한", "89": "케이뱅크",
  "90": "카카오뱅크", "92": "토스뱅크",
};

export function depositInfo(payment: TossPayment): DepositInfo | null {
  const va = payment.virtualAccount as
    | { accountNumber?: string; bankCode?: string; dueDate?: string | null }
    | null
    | undefined;
  if (!va?.accountNumber) return null;
  const code = va.bankCode ?? "";
  return {
    bank: BANKS[code] ?? (code ? `은행 코드 ${code}` : "은행"),
    accountNumber: va.accountNumber,
    dueDate: va.dueDate ?? null,
    amount: payment.totalAmount,
  };
}

/** 토스가 알려준 결제 상태를 주문에 반영 */
export async function applyTossPayment(
  order: PaymentOrder,
  payment: TossPayment,
  deps: FinalizeDeps,
): Promise<FinalizeResult> {
  if (payment.orderId !== order.order_id) return err("주문 정보가 결제와 일치하지 않습니다.");
  const plan = await deps.plan(order.plan_id);
  if (!plan) return err("플랜 정보를 찾을 수 없습니다.");

  switch (payment.status) {
    case "DONE": {
      const expected = chargeAmount(plan, order.kind);
      if (payment.totalAmount !== expected) {
        await deps.markFailed(order.id, {
          paymentKey: payment.paymentKey,
          reason: `AMOUNT_MISMATCH: ${payment.totalAmount} != ${expected}`,
          raw: payment,
        });
        return err("결제 금액이 플랜 가격과 달라 플랜을 적용하지 않았어요. 고객센터로 문의해 주세요.");
      }
      const r = await deps.markPaid(order.id, payment);
      if ("error" in r) {
        // 토스 쪽은 결제 완료 — 다시 열면 조회 경로로 다시 반영된다
        return err(`결제는 완료되었지만 기록 저장에 실패했어요. 잠시 후 이 페이지를 새로고침해 주세요. (${r.error})`, true);
      }
      return { status: "paid", alreadyPaid: !r.transitioned, planName: plan.name, expiresAt: r.expiresAt ?? "" };
    }
    case "WAITING_FOR_DEPOSIT":
      if (order.status === "ready") await deps.markWaiting(order.id, payment);
      return { status: "waiting", planName: plan.name, deposit: depositInfo(payment) };
    case "CANCELED":
    case "PARTIAL_CANCELED":
    case "ABORTED":
    case "EXPIRED":
      await deps.markFailed(order.id, { paymentKey: payment.paymentKey, reason: payment.status, raw: payment });
      return err(CLOSED_MESSAGES[payment.status]);
    default:
      return err(`결제가 아직 완료되지 않았어요. 잠시 후 새로고침해 주세요. (상태: ${payment.status})`);
  }
}

/** 성공 리다이렉트로 받은 결제를 승인하고 반영 */
export async function confirmAndFinalize(
  order: PaymentOrder,
  params: { paymentKey: string; orderId: string; amount: number },
  deps: FinalizeDeps,
): Promise<FinalizeResult> {
  if (order.order_id !== params.orderId) return err("주문 정보가 결제와 일치하지 않습니다.");

  // 새로고침 등으로 인한 재방문 → 이미 완료된 성공으로 처리 (멱등성)
  if (order.status === "paid") {
    const plan = await deps.plan(order.plan_id);
    return {
      status: "paid",
      alreadyPaid: true,
      planName: plan?.name ?? "BUSINESS",
      expiresAt: (await deps.currentExpiry(order.advertiser_id)) ?? "",
    };
  }
  if (order.status !== "ready") return err("이미 처리된 주문입니다.");

  const plan = await deps.plan(order.plan_id);
  if (!plan) return err("플랜 정보를 찾을 수 없습니다.");
  if (params.amount !== chargeAmount(plan, "one_time")) return err("결제 금액이 플랜 가격과 일치하지 않습니다.");

  const result = await deps.confirm(params);
  if (result.ok) return applyTossPayment(order, result.payment, deps);

  // 이미 처리됨(동시 요청·입금 대기 재방문) 또는 결과를 못 받음 → 토스 기록 기준으로 맞춘다. 실패로 단정하지 않음.
  if (result.error.code === "ALREADY_PROCESSED_PAYMENT" || transient(result)) {
    const found = await deps.lookup(params.paymentKey);
    if (found.ok) return applyTossPayment(order, found.payment, deps);
    return err("결제 상태를 확인하지 못했어요. 잠시 후 이 페이지를 새로고침해 주세요.", true);
  }

  await deps.markFailed(order.id, {
    paymentKey: params.paymentKey,
    reason: `${result.error.code}: ${result.error.message}`,
  });
  return err(dbErrorMessage(result.error, "결제에 실패했어요. 카드 정보를 확인하거나 다른 카드로 다시 시도해 주세요."));
}

/** 웹훅 — 결제 키로 토스에 직접 물어본 상태를 반영(웹훅 본문의 상태는 믿지 않는다) */
export async function syncOrderFromToss(order: PaymentOrder, paymentKey: string, deps: FinalizeDeps): Promise<FinalizeResult> {
  const found = await deps.lookup(paymentKey);
  if (!found.ok) return err(`${found.error.code}: ${found.error.message}`, transient(found));
  return applyTossPayment(order, found.payment, deps);
}

/** service_role 클라이언트로 만든 실제 의존성. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function adminFinalizeDeps(admin: any, toss: Pick<FinalizeDeps, "confirm" | "lookup">): FinalizeDeps {
  const snapshot = (p: TossPayment) => JSON.parse(JSON.stringify(p));
  return {
    ...toss,
    plan: async (planId) => {
      const { data } = await admin.from("plans").select("id, name, monthly_price, list_price, one_time_amount, subscription_amount").eq("id", planId).maybeSingle();
      return (data as PaymentPlan | null) ?? null;
    },
    markPaid: async (orderRowId, payment) => {
      const { data, error } = await admin.rpc("finalize_paid_payment", {
        p_payment_id: orderRowId,
        p_payment_key: payment.paymentKey,
        p_method: payment.method,
        p_approved_at: payment.approvedAt,
        p_raw: snapshot(payment),
        p_days: SUBSCRIPTION_DAYS,
      });
      if (error) return { error: error.message as string };
      const row = (data as { transitioned: boolean; expires_at: string | null }[] | null)?.[0];
      if (!row) return { error: "주문을 찾을 수 없습니다." };
      return { transitioned: row.transitioned, expiresAt: row.expires_at };
    },
    markFailed: async (orderRowId, f) => {
      await admin
        .from("payments")
        .update({ status: "failed", payment_key: f.paymentKey, fail_reason: f.reason, ...(f.raw ? { raw: snapshot(f.raw) } : {}) })
        .eq("id", orderRowId)
        .eq("status", "ready");
    },
    markWaiting: async (orderRowId, payment) => {
      await admin
        .from("payments")
        .update({ payment_key: payment.paymentKey, method: payment.method, raw: snapshot(payment) })
        .eq("id", orderRowId)
        .eq("status", "ready");
    },
    currentExpiry: async (advertiserId) => {
      const { data } = await admin.from("subscriptions").select("expires_at").eq("advertiser_id", advertiserId).maybeSingle();
      return (data as { expires_at: string | null } | null)?.expires_at ?? null;
    },
  };
}
