"use server";

import { createClient } from "@/lib/supabase/server";
import { dbErrorMessage, dbErrorWith } from "@/lib/db-errors";
import { revalidatePath } from "next/cache";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { confirmTossPayment, getTossPayment } from "@/lib/payments/toss";
import { adminFinalizeDeps, confirmAndFinalize, type FinalizeResult } from "@/lib/payments/finalize";

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
