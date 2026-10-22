import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { getAutopayOffer } from "@/lib/payments/autopay-offer";
import { AutopayClient } from "./AutopayClient";
import { AutopayTerms } from "./AutopayTerms";

export const metadata = { title: "정기결제 카드 — 루비AI" };

/** 정기결제 카드 등록·변경 전용 — 처음 결제는 결제 페이지(/dashboard/billing/checkout)에서 방식을 고른다 */
export default async function AutopayPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login?redirect=/dashboard/billing/autopay");
  if (profile.role !== "advertiser") redirect("/dashboard");

  const offer = await getAutopayOffer(profile.id);
  if (!offer.available) redirect("/dashboard/billing/checkout");
  const changing = !!offer.cardLabel;

  return (
    <div>
      <Link href="/dashboard/billing" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" />
        구독·결제로 돌아가기
      </Link>
      <h1 className="display mt-3 text-3xl font-semibold lg:text-4xl">{changing ? "정기결제 카드 변경" : `${offer.planName} 월 구독(정기결제)`}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {changing ? `지금 등록된 카드(${offer.cardLabel})를 새 카드로 바꿔요. ` : ""}
        {offer.when}
      </p>

      <div className="mt-8 max-w-2xl space-y-4">
        <AutopayTerms planName={offer.planName} prices={offer.prices} />
        <AutopayClient changing={changing} cta={offer.cta} />
      </div>
    </div>
  );
}
