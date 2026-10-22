import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { chargeBillingKey, deleteBillingKey, getBillingPaymentByOrderId, isBillingConfigured, issueBillingKey } from "@/lib/payments/toss";
import { adminBillingDeps, runBillingRenewals } from "@/lib/payments/billing";

/**
 * 자동결제 갱신 — pg_cron billing-renewals(매일 01:00 UTC = 10:00 KST)가 request_billing_renewals() 로 부른다(x-webhook-secret).
 * 응답 못 받은 주문 확인 → 유예 끝난 자동결제 해지 → 만료 24시간 안 구독 결제. 자동결제 키가 없으면 아무것도 안 함.
 */
export const maxDuration = 300;

export async function POST(req: Request) {
  const secret = process.env.NOTIFICATION_WEBHOOK_SECRET;
  if (!secret || req.headers.get("x-webhook-secret") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isBillingConfigured()) return NextResponse.json({ ok: true, skipped: "billing not configured" });
  try {
    const summary = await runBillingRenewals(
      adminBillingDeps(getAdminSupabase(), {
        charge: chargeBillingKey,
        lookupOrder: getBillingPaymentByOrderId,
        issue: issueBillingKey,
        deleteKey: deleteBillingKey,
      }),
    );
    console.log("[cron/billing-renewals]", JSON.stringify(summary));
    return NextResponse.json({ ok: true, ...summary });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[cron/billing-renewals] failed", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
