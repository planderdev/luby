import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { getTossPayment } from "@/lib/payments/toss";
import { adminFinalizeDeps, syncOrderFromToss, type PaymentOrder } from "@/lib/payments/finalize";

/**
 * 토스페이먼츠 웹훅 — 결제 상태 변경(PAYMENT_STATUS_CHANGED)·가상계좌 입금(DEPOSIT_CALLBACK).
 * 본문은 주문번호·결제 키를 찾는 데만 쓰고, 상태는 시크릿 키로 토스 API에 직접 다시 물어본 결과로 반영한다
 * (위조된 요청이 와도 토스 기록과 다른 상태로 바꿀 수 없고, 다른 주문의 결제 키는 주문번호 대조에서 걸러진다).
 * 입금 콜백(DEPOSIT_CALLBACK)엔 결제 키가 없어서 가상계좌 발급 때 주문에 저장해 둔 결제 키를 쓴다. 토스는 200 이 아니면 재시도하므로
 * 일시 오류만 500, 모르는 주문·아직 결제 전 주문은 200 으로 끝낸다.
 * 등록: 토스페이먼츠 개발자센터 → 웹훅 → https://luby.im/api/payments/toss/webhook
 */
export const maxDuration = 30;

const ORDER_ID = /^ruby_[0-9a-f]{32}$/;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | { eventType?: string; orderId?: string; data?: { orderId?: string; paymentKey?: string } }
    | null;
  const orderId = body?.data?.orderId ?? body?.orderId ?? "";
  if (!ORDER_ID.test(orderId)) return NextResponse.json({ ok: true, ignored: "no order" });

  const admin = getAdminSupabase();
  const { data: order } = await admin
    .from("payments")
    .select("id, order_id, plan_id, status, advertiser_id, payment_key, kind")
    .eq("order_id", orderId)
    .maybeSingle();
  if (!order) return NextResponse.json({ ok: true, ignored: "unknown order" });
  const paymentKey = order.payment_key ?? body?.data?.paymentKey ?? "";
  if (!paymentKey) return NextResponse.json({ ok: true, ignored: "no payment key" });

  const r = await syncOrderFromToss(
    order as PaymentOrder,
    paymentKey,
    adminFinalizeDeps(admin, { confirm: async () => { throw new Error("webhook never confirms"); }, lookup: getTossPayment }),
  );

  if (r.status === "paid" && !r.alreadyPaid) {
    // 입금 확인 등으로 웹훅에서 처음 확정된 결제 — 광고주에게 알림(메일 웹훅도 이 행으로 나감)
    const until = r.expiresAt ? new Date(r.expiresAt).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" }) : "";
    await admin.from("notifications").insert({
      user_id: order.advertiser_id,
      type: "system",
      title: `결제가 확인됐어요 — ${r.planName} 플랜 적용`,
      body: until ? `${until}까지 ${r.planName} 플랜의 모든 혜택이 적용됩니다.` : `${r.planName} 플랜의 모든 혜택이 적용되었습니다.`,
      link: "/dashboard/billing",
    });
  }
  if (r.status === "error" && r.retryable) {
    console.error("[toss-webhook] retryable", orderId, r.error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  console.log("[toss-webhook]", body?.eventType ?? "DEPOSIT_CALLBACK", orderId, r.status);
  return NextResponse.json({ ok: true, status: r.status });
}
