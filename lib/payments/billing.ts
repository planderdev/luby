/**
 * 자동결제(빌링) — 카드 등록 → 첫 결제, 매일 10:00 KST 갱신 작업. 결제 결과 반영은 finalize.ts 의
 * applyTossPayment(finalize_paid_payment 한 트랜잭션: 결제 확정 + 구독 연장 + auto_renew)를 그대로 쓴다.
 *
 * 2026-10-22 사장님 결정
 * - 자동결제 기본 + 1개월 단건 결제 유지
 * - 만료 24시간 안에 들면 결제(성공 시 기존 만료일에 +30일 — 끊김 없음), D-3 '자동결제 예정' 알림은 DB 함수가 보냄
 * - 실패 시 만료 후 3일 유예(BUSINESS 유지) + 매일 재시도, 끝내 실패하면 자동결제 해지 → FREE
 *
 * 결제 요청은 주문번호를 멱등키로 보내고, 응답을 못 받으면 같은 키로 한 번 더 → 주문번호 조회 → 그래도 모르면
 * 주문을 ready 로 남겨 다음 실행이 확인한다(그동안 그 광고주는 다시 결제하지 않음 — billing_renewal_due 조건).
 */
import type { TossBillingAuth, TossConfirmResult, TossError } from "./toss";
import {
  applyTossPayment,
  adminFinalizeDeps,
  type FinalizeDeps,
  type FinalizeResult,
  type PaymentOrder,
  type PaymentPlan,
} from "./finalize";
import { dbErrorMessage } from "@/lib/db-errors";

export type BillingCard = {
  id: string;
  billingKey: string;
  customerKey: string;
  cardCompany: string | null;
  cardNumber: string | null;
};
export type ChargeTarget = {
  advertiserId: string;
  email: string | null;
  name: string | null;
  plan: PaymentPlan;
  card: BillingCard;
  kind: "billing_first" | "billing_renewal";
};
export type DueRenewal = Omit<ChargeTarget, "kind"> & { expiresAt: string; graceUntil: string | null; attempts: number };

type TossCall<T> = { ok: true; data: T } | { ok: false; error: TossError; status: number };
type ChargeBody = { customerKey: string; amount: number; orderId: string; orderName: string; customerEmail?: string; customerName?: string };

export type BillingToss = {
  charge: (billingKey: string, body: ChargeBody) => Promise<TossConfirmResult>;
  lookupOrder: (orderId: string) => Promise<TossConfirmResult>;
  issue: (p: { authKey: string; customerKey: string }) => Promise<TossCall<TossBillingAuth>>;
  deleteKey: (billingKey: string) => Promise<unknown>;
};

export type BillingDeps = FinalizeDeps &
  BillingToss & {
    newOrderId: () => string;
    createOrder: (t: ChargeTarget, orderId: string, orderName: string) => Promise<PaymentOrder | { error: string }>;
    notify: (userId: string, type: string, title: string, body: string) => Promise<void>;
    now: () => Date;
  };

export type RenewalDeps = BillingDeps & {
  pendingOrders: (createdBeforeIso: string) => Promise<PaymentOrder[]>;
  closeExpiredGrace: (now: Date) => Promise<{ advertiserId: string; planName: string }[]>;
  due: (now: Date) => Promise<DueRenewal[]>;
  claim: (advertiserId: string, now: Date) => Promise<boolean>;
  recordFailure: (advertiserId: string, error: string) => Promise<{ graceUntil: string | null } | null>;
};

export type SubState = { tier: string; expiresAt: string | null; graceUntil: string | null; autoRenew: boolean };
export type RegisterDeps = BillingDeps & {
  pendingMethod: (advertiserId: string, customerKey: string) => Promise<{ id: string; status: string } | null>;
  activate: (methodId: string, auth: TossBillingAuth) => Promise<{ card: BillingCard; replacedKeys: string[] } | { error: string }>;
  dropPending: (methodId: string) => Promise<void>;
  activeCard: (advertiserId: string) => Promise<BillingCard | null>;
  subscription: (advertiserId: string) => Promise<SubState | null>;
  businessPlan: () => Promise<PaymentPlan | null>;
  setAutoRenew: (advertiserId: string, on: boolean) => Promise<void>;
  hasPendingCharge: (advertiserId: string) => Promise<boolean>;
  recordFailure: RenewalDeps["recordFailure"];
};

const DAY = 24 * 60 * 60 * 1000;
export const GRACE_DAYS = 3;
const transient = (r: { status: number }) => r.status === 0 || r.status === 409 || r.status >= 500;
const err = (error: string, retryable = false): FinalizeResult => ({ status: "error", error, ...(retryable ? { retryable } : {}) });
export const kstDay = (iso: string) => new Date(iso).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric" });
export const cardLabel = (c: Pick<BillingCard, "cardCompany" | "cardNumber">) => [c.cardCompany, c.cardNumber].filter(Boolean).join(" ") || "등록 카드";
const won = (n: number) => `₩${n.toLocaleString("ko-KR")}`;

/** 상태 판정 — 만료 전이거나 자동결제 유예 중이면 유효 */
export function inGrace(sub: Pick<SubState, "expiresAt" | "graceUntil">, now: number): boolean {
  return !!sub.expiresAt && new Date(sub.expiresAt).getTime() <= now && !!sub.graceUntil && new Date(sub.graceUntil).getTime() > now;
}

/** 빌링키로 1개월 이용료를 한 번 결제하고 반영 */
export async function chargeOnce(t: ChargeTarget, deps: BillingDeps): Promise<FinalizeResult> {
  const orderId = deps.newOrderId();
  const orderName = `루비AI ${t.plan.name} 플랜 자동결제 (1개월)`;
  const order = await deps.createOrder(t, orderId, orderName);
  if ("error" in order) return err(`주문을 만들지 못했어요. (${order.error})`, true);

  const body: ChargeBody = {
    customerKey: t.card.customerKey,
    amount: t.plan.monthly_price,
    orderId,
    orderName,
    ...(t.email ? { customerEmail: t.email } : {}),
    ...(t.name ? { customerName: t.name } : {}),
  };
  let r = await deps.charge(t.card.billingKey, body);
  if (!r.ok && transient(r)) r = await deps.charge(t.card.billingKey, body); // 같은 멱등키 — 이미 결제됐으면 그 결과가 온다
  if (!r.ok && transient(r)) {
    const found = await deps.lookupOrder(orderId);
    if (found.ok) return applyTossPayment(order, found.payment, deps);
    return err("결제 결과를 아직 확인하지 못했어요. 확인되는 대로 반영할게요.", true);
  }
  if (!r.ok) {
    await deps.markFailed(order.id, { paymentKey: null, reason: `${r.error.code}: ${r.error.message}` });
    return err(dbErrorMessage(r.error, "카드 결제에 실패했어요. 한도·잔액을 확인하거나 다른 카드로 바꿔 주세요."));
  }
  return applyTossPayment(order, r.payment, deps);
}

/** 매일 갱신 작업 — ①응답 못 받은 주문 확인 ②유예 끝난 자동결제 해지 ③만료 24시간 안 구독 결제 */
export async function runBillingRenewals(deps: RenewalDeps) {
  const now = deps.now();
  const s = { reconciled: 0, closed: 0, due: 0, paid: 0, failed: 0, pending: 0, skipped: 0 };

  for (const o of await deps.pendingOrders(new Date(now.getTime() - 10 * 60 * 1000).toISOString())) {
    const found = await deps.lookupOrder(o.order_id);
    if (found.ok) {
      const r = await applyTossPayment(o, found.payment, deps);
      if (r.status === "paid" && !r.alreadyPaid) {
        await deps.notify(o.advertiser_id, "billing_renewed", `${r.planName} 자동결제 완료`, `결제가 확인됐어요. ${kstDay(r.expiresAt)}까지 ${r.planName} 플랜을 이용할 수 있어요.`);
      }
      s.reconciled++;
    } else if (!transient(found)) {
      await deps.markFailed(o.id, { paymentKey: null, reason: `${found.error.code}: 토스에 결제 기록 없음` });
      s.reconciled++;
    }
  }

  for (const c of await deps.closeExpiredGrace(now)) {
    await deps.notify(
      c.advertiserId,
      "billing_cancelled",
      "자동결제가 해지되었어요",
      `카드 결제가 계속 실패해 ${c.planName} 자동결제를 해지했어요. 지금은 FREE 플랜이에요. 구독·결제에서 카드를 다시 등록하면 바로 이어서 이용할 수 있어요.`,
    );
    s.closed++;
  }

  const due = await deps.due(now);
  s.due = due.length;
  for (const d of due) {
    if (!(await deps.claim(d.advertiserId, now))) {
      s.skipped++;
      continue;
    }
    const r = await chargeOnce({ ...d, kind: "billing_renewal" }, deps);
    if (r.status === "paid") {
      s.paid++;
      await deps.notify(
        d.advertiserId,
        "billing_renewed",
        `${d.plan.name} 자동결제 완료`,
        `${d.plan.name} 1개월 이용료 ${won(d.plan.monthly_price)}을 ${cardLabel(d.card)} 카드로 결제했어요. ${kstDay(r.expiresAt)}까지 이용할 수 있어요.`,
      );
    } else if (r.status === "error" && r.retryable) {
      s.pending++;
    } else if (r.status === "error") {
      s.failed++;
      const f = await deps.recordFailure(d.advertiserId, r.error);
      const until = f?.graceUntil ?? new Date(new Date(d.expiresAt).getTime() + GRACE_DAYS * DAY).toISOString();
      await deps.notify(
        d.advertiserId,
        "billing_failed",
        `${d.plan.name} 자동결제에 실패했어요`,
        `${r.error} ${kstDay(until)}까지 카드를 바꾸거나 다시 결제하지 않으면 FREE 플랜으로 전환돼요. 그때까지 매일 다시 시도해요.`,
      );
    }
  }
  return s;
}

/** 결과에는 빌링키·customerKey 를 싣지 않는다(서버 액션 응답으로 브라우저에 갈 수 있음) — 카드사·마스킹 번호만 */
export type PublicCard = Pick<BillingCard, "cardCompany" | "cardNumber">;
const pub = (c: BillingCard): PublicCard => ({ cardCompany: c.cardCompany, cardNumber: c.cardNumber });

export type RegisterResult =
  | { status: "registered"; card: PublicCard; nextChargeAt: string | null; expiresAt: string | null }
  | { status: "paid"; card: PublicCard; planName: string; expiresAt: string }
  | { status: "charge_failed"; card: PublicCard; error: string; pending: boolean }
  | { status: "already"; card: PublicCard | null }
  | { status: "error"; error: string };

/** 결제가 필요한 상황이면 지금 결제(첫 결제 또는 유예 중 재결제), 아니면 다음 갱신부터 자동결제 */
export async function settleAfterCard(advertiserId: string, who: { email: string | null; name: string | null }, card: BillingCard, deps: RegisterDeps): Promise<RegisterResult> {
  const now = deps.now().getTime();
  const sub = await deps.subscription(advertiserId);
  const activePaid = !!sub && sub.tier !== "free" && (sub.expiresAt === null || new Date(sub.expiresAt).getTime() > now);

  if (activePaid && !(sub && inGrace(sub, now))) {
    if (sub!.tier === "business") await deps.setAutoRenew(advertiserId, true);
    return {
      status: "registered",
      card: pub(card),
      expiresAt: sub!.expiresAt,
      nextChargeAt: sub!.tier === "business" && sub!.expiresAt ? new Date(new Date(sub!.expiresAt).getTime() - DAY).toISOString() : null,
    };
  }

  const plan = await deps.businessPlan();
  if (!plan) return { status: "error", error: "플랜 정보를 찾을 수 없습니다." };
  if (await deps.hasPendingCharge(advertiserId)) {
    return { status: "charge_failed", card: pub(card), error: "확인 중인 결제가 있어요. 잠시 후 다시 확인해 주세요.", pending: true };
  }
  const grace = !!sub && inGrace(sub, now);
  const r = await chargeOnce({ advertiserId, ...who, plan, card, kind: grace ? "billing_renewal" : "billing_first" }, deps);
  if (r.status === "paid") return { status: "paid", card: pub(card), planName: r.planName, expiresAt: r.expiresAt };
  if (r.status === "error" && grace && !r.retryable) await deps.recordFailure(advertiserId, r.error);
  return { status: "charge_failed", card: pub(card), error: r.status === "error" ? r.error : "결제가 완료되지 않았어요.", pending: r.status === "error" && !!r.retryable };
}

/** 카드 등록창 성공 리다이렉트 처리 — 빌링키 발급·저장(이전 카드 교체) 후 settleAfterCard */
export async function completeCardRegistration(
  input: { advertiserId: string; email: string | null; name: string | null; customerKey: string; authKey: string },
  deps: RegisterDeps,
): Promise<RegisterResult> {
  const m = await deps.pendingMethod(input.advertiserId, input.customerKey);
  if (!m) return { status: "error", error: "카드 등록 요청을 찾을 수 없어요. 처음부터 다시 시도해 주세요." };
  // 새로고침 — 이미 처리된 등록이면 현재 상태만 보여준다(다시 결제하지 않음)
  if (m.status !== "pending") {
    const card = await deps.activeCard(input.advertiserId);
    return { status: "already", card: card ? pub(card) : null };
  }

  const issued = await deps.issue({ authKey: input.authKey, customerKey: input.customerKey });
  if (!issued.ok) {
    await deps.dropPending(m.id);
    return { status: "error", error: dbErrorMessage(issued.error, "카드를 등록하지 못했어요. 카드 정보를 확인하고 다시 시도해 주세요.") };
  }
  if (issued.data.customerKey !== input.customerKey || !issued.data.billingKey) {
    await deps.dropPending(m.id);
    return { status: "error", error: "카드 등록 정보가 일치하지 않아요. 다시 시도해 주세요." };
  }
  const act = await deps.activate(m.id, issued.data);
  if ("error" in act) {
    // 동시에 같은 요청이 먼저 처리했으면(이미 active) 그 결과를 보여준다
    const card = await deps.activeCard(input.advertiserId);
    if (card?.customerKey === input.customerKey) return { status: "already", card: pub(card) };
    return { status: "error", error: `카드 저장에 실패했어요. (${act.error})` };
  }
  for (const k of act.replacedKeys) await deps.deleteKey(k).catch(() => undefined);
  return settleAfterCard(input.advertiserId, { email: input.email, name: input.name }, act.card, deps);
}

/** service_role 클라이언트로 만든 실제 의존성. 토스 호출은 밖에서 넣는다(서버 전용 모듈 분리). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function adminBillingDeps(admin: any, toss: BillingToss): RenewalDeps & RegisterDeps {
  const fin = adminFinalizeDeps(admin, {
    confirm: async () => ({ ok: false, status: 400, error: { code: "NOT_SUPPORTED", message: "자동결제에서는 쓰지 않음" } }),
    lookup: async () => ({ ok: false, status: 400, error: { code: "NOT_SUPPORTED", message: "자동결제는 주문번호로 조회" } }),
  });
  const toCard = (r: { id: string; billing_key: string; customer_key: string; card_company: string | null; card_number: string | null }): BillingCard => ({
    id: r.id,
    billingKey: r.billing_key,
    customerKey: r.customer_key,
    cardCompany: r.card_company,
    cardNumber: r.card_number,
  });
  const recordFailure: RenewalDeps["recordFailure"] = async (advertiserId, error) => {
    const { data } = await admin.rpc("billing_record_failure", { p_advertiser: advertiserId, p_error: error });
    const row = (data as { grace_until: string | null }[] | null)?.[0];
    return row ? { graceUntil: row.grace_until } : null;
  };
  return {
    ...fin,
    ...toss,
    now: () => new Date(),
    newOrderId: () => `ruby_${crypto.randomUUID().replace(/-/g, "")}`,
    createOrder: async (t, orderId, orderName) => {
      const { data, error } = await admin
        .from("payments")
        .insert({
          advertiser_id: t.advertiserId,
          plan_id: t.plan.id,
          order_id: orderId,
          order_name: orderName,
          amount: t.plan.monthly_price,
          status: "ready",
          kind: t.kind,
          billing_method_id: t.card.id,
        })
        .select("id, order_id, plan_id, status, advertiser_id")
        .single();
      return error ? { error: error.message as string } : (data as PaymentOrder);
    },
    notify: async (userId, type, title, body) => {
      await admin.from("notifications").insert({ user_id: userId, type, title, body, link: "/dashboard/billing" });
    },
    pendingOrders: async (beforeIso) => {
      const { data } = await admin
        .from("payments")
        .select("id, order_id, plan_id, status, advertiser_id")
        .eq("status", "ready")
        .neq("kind", "one_time")
        .lt("created_at", beforeIso)
        .gt("created_at", new Date(Date.now() - 14 * DAY).toISOString()); // 멱등키 유효 15일 안쪽만
      return (data ?? []) as PaymentOrder[];
    },
    closeExpiredGrace: async (now) => {
      const { data } = await admin.rpc("billing_close_expired_grace", { p_now: now.toISOString() });
      return ((data ?? []) as { advertiser_id: string; plan_name: string }[]).map((r) => ({ advertiserId: r.advertiser_id, planName: r.plan_name }));
    },
    due: async (now) => {
      const { data } = await admin.rpc("billing_renewal_due", { p_now: now.toISOString() });
      type Row = {
        advertiser_id: string; email: string | null; name: string | null; plan_id: string; plan_name: string; monthly_price: number;
        expires_at: string; grace_until: string | null; renew_attempts: number;
        billing_method_id: string; billing_key: string; customer_key: string; card_company: string | null; card_number: string | null;
      };
      return ((data ?? []) as Row[]).map((r) => ({
        advertiserId: r.advertiser_id,
        email: r.email,
        name: r.name,
        plan: { id: r.plan_id, name: r.plan_name, monthly_price: r.monthly_price },
        card: toCard({ id: r.billing_method_id, billing_key: r.billing_key, customer_key: r.customer_key, card_company: r.card_company, card_number: r.card_number }),
        expiresAt: r.expires_at,
        graceUntil: r.grace_until,
        attempts: r.renew_attempts,
      }));
    },
    claim: async (advertiserId, now) => {
      const { data } = await admin.rpc("billing_claim_renewal", { p_advertiser: advertiserId, p_now: now.toISOString() });
      return data === true;
    },
    recordFailure,
    pendingMethod: async (advertiserId, customerKey) => {
      const { data } = await admin.from("billing_methods").select("id, status").eq("advertiser_id", advertiserId).eq("customer_key", customerKey).maybeSingle();
      return (data as { id: string; status: string } | null) ?? null;
    },
    activate: async (methodId, auth) => {
      const { data, error } = await admin.rpc("billing_activate_method", {
        p_method_id: methodId,
        p_billing_key: auth.billingKey,
        p_card_company: auth.cardCompany,
        p_card_number: auth.cardNumber,
        p_card_type: auth.card?.cardType ?? null,
        p_owner_type: auth.card?.ownerType ?? null,
      });
      const row = (data as { activated: boolean; replaced_keys: string[] }[] | null)?.[0];
      if (error || !row?.activated) return { error: (error?.message as string) ?? "이미 처리된 등록" };
      const { data: m } = await admin
        .from("billing_methods")
        .select("id, billing_key, customer_key, card_company, card_number")
        .eq("id", methodId)
        .single();
      return { card: toCard(m), replacedKeys: row.replaced_keys ?? [] };
    },
    dropPending: async (methodId) => {
      await admin.from("billing_methods").delete().eq("id", methodId).eq("status", "pending");
    },
    activeCard: async (advertiserId) => {
      const { data } = await admin
        .from("billing_methods")
        .select("id, billing_key, customer_key, card_company, card_number")
        .eq("advertiser_id", advertiserId)
        .eq("status", "active")
        .maybeSingle();
      return data ? toCard(data) : null;
    },
    subscription: async (advertiserId) => {
      const { data } = await admin
        .from("subscriptions")
        .select("status, expires_at, grace_until, auto_renew, plans(tier)")
        .eq("advertiser_id", advertiserId)
        .maybeSingle();
      if (!data || data.status !== "active") return null;
      return {
        tier: ((data.plans as { tier: string } | null)?.tier ?? "free") as string,
        expiresAt: data.expires_at,
        graceUntil: data.grace_until,
        autoRenew: data.auto_renew,
      };
    },
    businessPlan: async () => {
      const { data } = await admin.from("plans").select("id, name, monthly_price").eq("tier", "business").maybeSingle();
      return (data as PaymentPlan | null) ?? null;
    },
    setAutoRenew: async (advertiserId, on) => {
      await admin.from("subscriptions").update({ auto_renew: on, ...(on ? {} : { grace_until: null }) }).eq("advertiser_id", advertiserId);
    },
    hasPendingCharge: async (advertiserId) => {
      const { count } = await admin
        .from("payments")
        .select("id", { count: "exact", head: true })
        .eq("advertiser_id", advertiserId)
        .eq("status", "ready")
        .neq("kind", "one_time")
        .gt("created_at", new Date(Date.now() - 3 * DAY).toISOString());
      return (count ?? 0) > 0;
    },
  };
}
