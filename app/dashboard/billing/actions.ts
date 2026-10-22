"use server";

import { createClient } from "@/lib/supabase/server";
import { dbErrorMessage, dbErrorWith } from "@/lib/db-errors";
import { revalidatePath } from "next/cache";
import { getAdminSupabase } from "@/lib/supabase/admin";
import {
  chargeBillingKey,
  confirmTossPayment,
  deleteBillingKey,
  getBillingPaymentByOrderId,
  getTossPayment,
  isBillingConfigured,
  issueBillingKey,
} from "@/lib/payments/toss";
import { adminFinalizeDeps, confirmAndFinalize, type FinalizeResult } from "@/lib/payments/finalize";
import { adminBillingDeps, completeCardRegistration, settleAfterCard, type RegisterResult } from "@/lib/payments/billing";

type OrderResult =
  | {
      ok: true;
      orderId: string;
      orderName: string;
      amount: number;
      customerKey: string;
      customerEmail: string;
      customerName: string;
    }
  | { ok: false; error: string };

/**
 * BUSINESS 플랜 결제 주문 생성.
 * 금액은 서버가 plans 테이블에서 직접 조회 — 클라이언트가 금액을 만들 수 없음.
 */
export async function createBusinessOrder(): Promise<OrderResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const [{ data: profile }, { data: plan }] = await Promise.all([
    supabase.from("profiles").select("role, name, email").eq("id", user.id).single(),
    supabase
      .from("plans")
      .select("id, name, monthly_price")
      .eq("tier", "business")
      .single(),
  ]);

  if (profile?.role !== "advertiser") {
    return { ok: false, error: "광고주 계정만 결제할 수 있습니다." };
  }
  if (!plan) return { ok: false, error: "플랜 정보를 찾을 수 없습니다." };

  // orderId: 토스 규격 (6-64자, 영문/숫자/-/_)
  const orderId = `ruby_${crypto.randomUUID().replace(/-/g, "")}`;
  const orderName = `루비AI ${plan.name} 플랜 (1개월)`;

  const { error } = await supabase.from("payments").insert({
    advertiser_id: user.id,
    plan_id: plan.id,
    order_id: orderId,
    order_name: orderName,
    amount: plan.monthly_price,
    status: "ready",
  });
  if (error) return { ok: false, error: dbErrorWith("주문 생성 실패", error) };

  return {
    ok: true,
    orderId,
    orderName,
    amount: plan.monthly_price,
    customerKey: user.id,
    customerEmail: profile.email,
    customerName: profile.name,
  };
}

/**
 * 결제 승인 + 구독 업그레이드.
 *
 * 검증 순서 (스푸핑 방어):
 * 1. 주문이 본인 소유인지 (RLS로 조회)
 * 2. 승인 금액 == plans 테이블의 실제 플랜 가격 (payments 행 금액이 아니라
 *    플랜 원가와 대조 — 사용자가 낮은 금액으로 주문을 조작했어도 여기서 차단)
 * 3. 토스 승인 API가 성공(DONE)해야만 DB 반영 — 이미 처리됨·응답 유실이면 토스 조회 결과로 맞춤
 * 4. DB 반영은 service_role의 finalize_paid_payment 한 번으로 (결제 확정 + 구독 연장이 한 트랜잭션)
 * 자세한 흐름은 lib/payments/finalize.ts
 */
export async function confirmBusinessPayment(params: {
  paymentKey: string;
  orderId: string;
  amount: number;
}): Promise<FinalizeResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", error: "로그인이 필요합니다." };

  // 1. 본인 주문 조회 (RLS: payments_self_read)
  const { data: order } = await supabase
    .from("payments")
    .select("id, order_id, plan_id, status, advertiser_id")
    .eq("order_id", params.orderId)
    .maybeSingle();
  if (!order || order.advertiser_id !== user.id) return { status: "error", error: "주문을 찾을 수 없습니다." };

  // revalidatePath 금지: 이 함수는 success 페이지가 렌더링 중에 직접 호출하므로
  // (렌더링 중 revalidatePath는 Next.js가 예외를 던짐), 대시보드는 전부 동적 렌더링이라 불필요.
  return confirmAndFinalize(
    order,
    params,
    adminFinalizeDeps(getAdminSupabase(), { confirm: confirmTossPayment, lookup: getTossPayment }),
  );
}

/** 광고주: 완료된 결제에 세금계산서 발행 요청 (운영자에게 알림; 실제 발행은 운영자가 홈택스/API로) */
export async function requestTaxInvoice(paymentId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("request_tax_invoice", { p_payment_id: paymentId });
  if (error) return { ok: false, error: dbErrorMessage(error) };
  revalidatePath("/dashboard/billing");
  return { ok: true };
}

// ───────────────────────── 자동결제(빌링) ─────────────────────────

const billingDeps = () =>
  adminBillingDeps(getAdminSupabase(), {
    charge: chargeBillingKey,
    lookupOrder: getBillingPaymentByOrderId,
    issue: issueBillingKey,
    deleteKey: deleteBillingKey,
  });

async function currentAdvertiser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("id, role, name, email").eq("id", user.id).single();
  return profile?.role === "advertiser" ? profile : null;
}

/**
 * 카드 등록 시작 — customerKey 는 광고주 id 대신 추측할 수 없는 새 UUID(토스 권장). pending 행으로 남겨
 * 성공 리다이렉트의 customerKey 가 이 광고주가 시작한 등록인지 확인한다.
 */
export async function startBillingAuth(): Promise<
  | { ok: true; clientKey: string; customerKey: string; customerEmail: string; customerName: string }
  | { ok: false; error: string }
> {
  if (!isBillingConfigured()) return { ok: false, error: "자동결제 준비 중이에요. 1개월 결제를 이용해 주세요." };
  const me = await currentAdvertiser();
  if (!me) return { ok: false, error: "광고주 계정만 자동결제를 등록할 수 있습니다." };
  const admin = getAdminSupabase();
  const { data: sub } = await admin.from("subscriptions").select("status, expires_at, plans(tier)").eq("advertiser_id", me.id).maybeSingle();
  const tier = (sub?.plans as { tier: string } | null)?.tier;
  if (tier === "enterprise" && sub?.status === "active" && (!sub.expires_at || new Date(sub.expires_at).getTime() > Date.now())) {
    return { ok: false, error: "ENTERPRISE 플랜은 담당자와 별도 계약으로 결제해요." };
  }
  // 끝나지 않은 이전 시도는 정리(하루 지난 것)
  await admin.from("billing_methods").delete().eq("advertiser_id", me.id).eq("status", "pending").lt("created_at", new Date(Date.now() - 86_400_000).toISOString());
  const customerKey = crypto.randomUUID();
  const { error } = await admin.from("billing_methods").insert({ advertiser_id: me.id, customer_key: customerKey, status: "pending" });
  if (error) return { ok: false, error: dbErrorWith("카드 등록 준비 실패", error) };
  return {
    ok: true,
    clientKey: process.env.NEXT_PUBLIC_TOSS_BILLING_CLIENT_KEY!,
    customerKey,
    customerEmail: me.email,
    customerName: me.name,
  };
}

/** 카드 등록창 성공 리다이렉트 — success 페이지가 렌더링 중 호출(새로고침해도 다시 결제하지 않음) */
export async function completeBillingAuth(params: { customerKey: string; authKey: string }): Promise<RegisterResult> {
  const me = await currentAdvertiser();
  if (!me) return { status: "error", error: "로그인이 필요합니다." };
  return completeCardRegistration({ advertiserId: me.id, email: me.email, name: me.name, ...params }, billingDeps());
}

/** 자동결제 켜기/끄기 — 끄면 이번 만료일까지 쓰고 끝(유예 중이면 바로 종료). 켜기는 등록 카드 + BUSINESS 이용 중일 때만 */
export async function setAutoRenew(on: boolean): Promise<{ ok: true } | { ok: false; error: string }> {
  const me = await currentAdvertiser();
  if (!me) return { ok: false, error: "로그인이 필요합니다." };
  const deps = billingDeps();
  if (on) {
    const [card, sub] = await Promise.all([deps.activeCard(me.id), deps.subscription(me.id)]);
    if (!card) return { ok: false, error: "등록된 카드가 없어요. 카드를 먼저 등록해 주세요." };
    if (!sub || sub.tier !== "business" || !sub.expiresAt || new Date(sub.expiresAt).getTime() <= Date.now()) {
      return { ok: false, error: "BUSINESS 이용 중일 때 켤 수 있어요. 지금 결제하기로 다시 시작해 주세요." };
    }
  }
  await deps.setAutoRenew(me.id, on);
  revalidatePath("/dashboard/billing");
  return { ok: true };
}

/** 등록 카드 삭제 — 자동결제도 꺼지고 토스의 빌링키도 지운다 */
export async function removeBillingCard(): Promise<{ ok: true } | { ok: false; error: string }> {
  const me = await currentAdvertiser();
  if (!me) return { ok: false, error: "로그인이 필요합니다." };
  const deps = billingDeps();
  const card = await deps.activeCard(me.id);
  if (!card) return { ok: true };
  await deps.setAutoRenew(me.id, false);
  const admin = getAdminSupabase();
  const { error } = await admin.from("billing_methods").update({ status: "removed", removed_at: new Date().toISOString() }).eq("id", card.id).eq("status", "active");
  if (error) return { ok: false, error: dbErrorMessage(error) };
  await deleteBillingKey(card.billingKey).catch(() => undefined);
  revalidatePath("/dashboard/billing");
  return { ok: true };
}

/** 등록 카드로 지금 결제 — 첫 결제 실패 후 재시도, 또는 자동결제 실패 유예 중 바로 재결제 */
export async function payNowWithCard(): Promise<RegisterResult> {
  const me = await currentAdvertiser();
  if (!me) return { status: "error", error: "로그인이 필요합니다." };
  const deps = billingDeps();
  const card = await deps.activeCard(me.id);
  if (!card) return { status: "error", error: "등록된 카드가 없어요." };
  const r = await settleAfterCard(me.id, { email: me.email, name: me.name }, card, deps);
  revalidatePath("/dashboard/billing");
  return r;
}
