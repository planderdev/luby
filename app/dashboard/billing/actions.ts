"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { confirmTossPayment } from "@/lib/payments/toss";

const SUBSCRIPTION_DAYS = 30;

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
  if (error) return { ok: false, error: `주문 생성 실패: ${error.message}` };

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

type ConfirmResult =
  | { ok: true; alreadyPaid: boolean; planName: string; expiresAt: string }
  | { ok: false; error: string };

/**
 * 결제 승인 + 구독 업그레이드.
 *
 * 검증 순서 (스푸핑 방어):
 * 1. 주문이 본인 소유인지 (RLS로 조회)
 * 2. 승인 금액 == plans 테이블의 실제 플랜 가격 (payments 행 금액이 아니라
 *    플랜 원가와 대조 — 사용자가 낮은 금액으로 주문을 조작했어도 여기서 차단)
 * 3. 토스 승인 API가 성공(DONE)해야만 DB 반영
 * 4. DB 반영은 service_role로만 (authenticated에게 UPDATE 정책 없음)
 */
export async function confirmBusinessPayment(params: {
  paymentKey: string;
  orderId: string;
  amount: number;
}): Promise<ConfirmResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  // 1. 본인 주문 조회 (RLS: payments_self_read)
  const { data: order } = await supabase
    .from("payments")
    .select("id, plan_id, order_name, amount, status, advertiser_id")
    .eq("order_id", params.orderId)
    .maybeSingle();
  if (!order) return { ok: false, error: "주문을 찾을 수 없습니다." };

  // 새로고침 등으로 인한 중복 승인 → 이미 완료된 성공으로 처리 (멱등성)
  if (order.status === "paid") {
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("expires_at, plans(name)")
      .eq("advertiser_id", user.id)
      .maybeSingle();
    return {
      ok: true,
      alreadyPaid: true,
      planName: (sub?.plans as { name: string } | null)?.name ?? "BUSINESS",
      expiresAt: sub?.expires_at ?? "",
    };
  }
  if (order.status !== "ready") {
    return { ok: false, error: "이미 처리된 주문입니다." };
  }

  // 2. 금액은 플랜 원가와 대조
  const { data: plan } = await supabase
    .from("plans")
    .select("id, name, monthly_price")
    .eq("id", order.plan_id)
    .single();
  if (!plan) return { ok: false, error: "플랜 정보를 찾을 수 없습니다." };
  if (params.amount !== plan.monthly_price) {
    return { ok: false, error: "결제 금액이 플랜 가격과 일치하지 않습니다." };
  }

  // 3. 토스 승인 (실패 시 DB에 실패 기록)
  const result = await confirmTossPayment(params);
  const admin = getAdminSupabase();

  if (!result.ok) {
    await admin
      .from("payments")
      .update({
        status: "failed",
        payment_key: params.paymentKey,
        fail_reason: `${result.error.code}: ${result.error.message}`,
      })
      .eq("id", order.id);
    return { ok: false, error: result.error.message };
  }

  const payment = result.payment;
  if (payment.status !== "DONE") {
    return { ok: false, error: `결제가 완료되지 않았습니다. (상태: ${payment.status})` };
  }

  // 4. service_role로 결제 확정 + 구독 업그레이드
  // 만료 전 갱신이면 잔여 기간을 이어서 +30일 (잔여일 손실 방지)
  const now = new Date();
  const { data: currentSub } = await supabase
    .from("subscriptions")
    .select("expires_at, plan_id")
    .eq("advertiser_id", user.id)
    .maybeSingle();
  const isRenewal =
    currentSub?.plan_id === plan.id &&
    currentSub?.expires_at &&
    new Date(currentSub.expires_at) > now;
  const base = isRenewal ? new Date(currentSub!.expires_at!) : now;
  const expiresAt = new Date(base.getTime() + SUBSCRIPTION_DAYS * 24 * 60 * 60 * 1000);

  const { error: payErr } = await admin
    .from("payments")
    .update({
      status: "paid",
      payment_key: payment.paymentKey,
      method: payment.method,
      approved_at: payment.approvedAt,
      raw: JSON.parse(JSON.stringify(payment)),
    })
    .eq("id", order.id)
    .eq("status", "ready"); // 동시 요청 대비: ready였던 행만 갱신
  if (payErr) return { ok: false, error: `결제 기록 저장 실패: ${payErr.message}` };

  const { error: subErr } = await admin
    .from("subscriptions")
    .update({
      plan_id: plan.id,
      status: "active",
      started_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    })
    .eq("advertiser_id", user.id);
  if (subErr) {
    // 결제는 됐는데 구독 반영 실패 — 기록은 남아있으므로 운영자가 수동 복구 가능
    return {
      ok: false,
      error: `결제는 완료되었으나 구독 반영에 실패했습니다. 고객센터로 문의해주세요. (${subErr.message})`,
    };
  }

  // revalidatePath 금지: 이 함수는 success 페이지가 렌더링 중에 직접 호출하므로
  // (렌더링 중 revalidatePath는 Next.js가 예외를 던짐), 대시보드는 전부 동적 렌더링이라 불필요.
  return {
    ok: true,
    alreadyPaid: false,
    planName: plan.name,
    expiresAt: expiresAt.toISOString(),
  };
}

/** 광고주: 완료된 결제에 세금계산서 발행 요청 (운영자에게 알림; 실제 발행은 운영자가 홈택스/API로) */
export async function requestTaxInvoice(paymentId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("request_tax_invoice", { p_payment_id: paymentId });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/billing");
  return { ok: true };
}
