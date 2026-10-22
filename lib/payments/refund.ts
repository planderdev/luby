/**
 * 결제 환불(전액 취소) — 총운영관리자가 운영 화면에서 실행. 토스 취소 API 가 성공해야만 DB 를 '취소'로 바꾸고
 * (record_payment_refund: 상태·사유 기록, 선택 시 FREE 전환·정기결제 해지, 운영 기록, 광고주 알림) 한다.
 * 부분 환불·가상계좌 환불(환불 계좌 필요)은 범위 밖 — 토스 상점관리자에서.
 */
import type { TossConfirmResult } from "./toss";
import { dbErrorMessage } from "@/lib/db-errors";

export type RefundTarget = {
  id: string;
  status: string;
  payment_key: string | null;
  kind: string | null;
  method: string | null;
  amount: number;
};
export type RefundDeps = {
  load: (paymentId: string) => Promise<RefundTarget | null>;
  cancel: (paymentKey: string, reason: string, opts: { billing: boolean; idempotencyKey: string }) => Promise<TossConfirmResult>;
  record: (paymentId: string, reason: string, raw: unknown | null, downgrade: boolean) => Promise<{ error?: string }>;
};

export async function refundPayment(
  paymentId: string,
  input: { reason: string; downgrade: boolean },
  deps: RefundDeps,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const reason = input.reason.trim();
  if (reason.length < 2) return { ok: false, error: "환불 사유를 2자 이상 적어 주세요." };
  if (reason.length > 200) return { ok: false, error: "환불 사유는 200자까지 적을 수 있어요." };

  const p = await deps.load(paymentId);
  if (!p) return { ok: false, error: "결제를 찾을 수 없습니다." };
  if (p.status !== "paid") return { ok: false, error: "결제 완료 상태인 결제만 환불할 수 있어요." };
  if (!p.payment_key) return { ok: false, error: "결제 키가 없어 환불할 수 없어요. 토스 상점관리자에서 확인해 주세요." };
  if (p.method === "가상계좌") return { ok: false, error: "가상계좌 결제는 환불 받을 계좌가 필요해요. 토스 상점관리자에서 환불한 뒤 알려 주세요." };

  const r = await deps.cancel(p.payment_key, reason, { billing: !!p.kind && p.kind !== "one_time", idempotencyKey: `refund_${p.id}` });
  if (!r.ok && r.error.code !== "ALREADY_CANCELED_PAYMENT") {
    return { ok: false, error: dbErrorMessage(r.error, "환불하지 못했어요. 잠시 후 다시 시도하거나 토스 상점관리자에서 확인해 주세요.") };
  }
  if (r.ok && r.payment.status !== "CANCELED") {
    return { ok: false, error: `토스 결제 상태가 '${r.payment.status}'예요. 토스 상점관리자에서 확인해 주세요.` };
  }
  // 토스에서 이미 취소된 결제(상점관리자에서 먼저 환불)면 DB 만 맞춘다
  const rec = await deps.record(p.id, reason, r.ok ? JSON.parse(JSON.stringify(r.payment)) : null, input.downgrade);
  if (rec.error) return { ok: false, error: `토스 환불은 됐지만 기록 저장에 실패했어요. 다시 누르면 기록만 맞춰요. (${rec.error})` };
  return { ok: true };
}
