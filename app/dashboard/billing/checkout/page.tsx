import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { CheckoutClient } from "./CheckoutClient";
import { PaymentChooser } from "./PaymentChooser";
import { getAutopayOffer } from "@/lib/payments/autopay-offer";
import { planPrices, won } from "@/lib/payments/prices";

export const metadata = { title: "결제 — 루비AI" };

export default async function CheckoutPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login?redirect=/dashboard/billing/checkout");
  if (profile.role !== "advertiser") redirect("/dashboard");

  const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY ?? null;
  // 정기결제 키가 있으면 월 구독(정기결제)·단건 결제를 함께 보여주고 고르게 한다
  const offer = await getAutopayOffer(profile.id);
  if (!clientKey && !offer.available) {
    return (
      <div>
        <BackLink />
        <div className="mt-6 rounded-3xl border border-accent/30 bg-accent-soft/50 p-8 text-sm text-accent-ink">
          결제 모듈이 아직 설정되지 않았습니다. (NEXT_PUBLIC_TOSS_CLIENT_KEY 누락)
          <br />
          관리자에게 문의해주세요:{" "}
          <a href="mailto:contact@plander.io" className="underline">
            contact@plander.io
          </a>
        </div>
      </div>
    );
  }

  const supabase = await createClient();
  const { data: plan } = await supabase
    .from("plans")
    .select("name, monthly_price, list_price, one_time_amount, subscription_amount")
    .eq("tier", "business")
    .single();
  if (!plan) redirect("/dashboard/billing");

  return (
    <div>
      <BackLink />
      <h1 className="display mt-3 text-3xl font-semibold lg:text-4xl">
        {plan.name} 플랜 결제
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {offer.available
          ? `결제 방식을 골라 주세요 — 매월 자동결제되는 월 구독(정기결제, 할인가 ${won(planPrices(plan).monthly)}/월·부가세 별도) 또는 한 달씩 결제하는 단건 결제(${won(planPrices(plan).oneTime)}·부가세 포함).`
          : `${won(planPrices(plan).oneTime)}(부가세 포함) · 결제 즉시 30일간 BUSINESS 혜택이 적용됩니다.`}
      </p>

      <div className="mt-8 max-w-2xl">
        {offer.available ? (
          <PaymentChooser offer={offer} clientKey={clientKey} />
        ) : (
          <CheckoutClient clientKey={clientKey!} />
        )}
      </div>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/dashboard/billing"
      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-3.5" />
      구독·결제로 돌아가기
    </Link>
  );
}
