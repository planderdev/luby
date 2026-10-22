import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { isBillingConfigured } from "@/lib/payments/toss";
import { isSubscriptionActive } from "@/lib/plans/active";
import { AutopayClient } from "./AutopayClient";

export const metadata = { title: "자동결제 — 루비AI" };

const kst = (iso: string) => new Date(iso).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric" });

export default async function AutopayPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login?redirect=/dashboard/billing/autopay");
  if (profile.role !== "advertiser") redirect("/dashboard");
  if (!isBillingConfigured()) redirect("/dashboard/billing/checkout");

  // 카드(빌링키) 테이블은 service_role 전용 — 본인 것만 조회
  const admin = getAdminSupabase();
  const [{ data: plan }, { data: sub }, { data: card }] = await Promise.all([
    admin.from("plans").select("name, monthly_price").eq("tier", "business").single(),
    admin.from("subscriptions").select("status, expires_at, grace_until, auto_renew, plans(tier)").eq("advertiser_id", profile.id).maybeSingle(),
    admin.from("billing_methods").select("card_company, card_number").eq("advertiser_id", profile.id).eq("status", "active").maybeSingle(),
  ]);
  if (!plan) redirect("/dashboard/billing");

  const tier = (sub?.plans as { tier: string } | null)?.tier ?? "free";
  if (tier === "enterprise" && isSubscriptionActive(sub)) redirect("/dashboard/billing");
  const now = Date.now();
  const graceNow = !!sub?.expires_at && new Date(sub.expires_at).getTime() <= now && !!sub.grace_until && new Date(sub.grace_until).getTime() > now;
  const activeBusiness = tier === "business" && !!sub?.expires_at && new Date(sub.expires_at).getTime() > now;
  const price = `₩${plan.monthly_price.toLocaleString()}`;

  const when = graceNow
    ? `카드를 등록하면 밀린 이번 달 이용료 ${price}을 바로 결제하고, 기존 만료일에 이어서 30일이 연장돼요.`
    : activeBusiness
      ? `지금은 결제하지 않아요. 현재 이용 기간이 끝나기 하루 전(${kst(new Date(new Date(sub!.expires_at!).getTime() - 86_400_000).toISOString())})부터 매월 ${price}이 자동결제돼요.`
      : `카드를 등록하면 첫 달 이용료 ${price}을 바로 결제하고 오늘부터 30일간 ${plan.name} 혜택이 적용돼요.`;

  const changing = !!card;
  return (
    <div>
      <Link href="/dashboard/billing" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" />
        구독·결제로 돌아가기
      </Link>
      <h1 className="display mt-3 text-3xl font-semibold lg:text-4xl">{changing ? "자동결제 카드 변경" : `${plan.name} 자동결제`}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {changing ? `지금 등록된 카드(${[card!.card_company, card!.card_number].filter(Boolean).join(" ")})를 새 카드로 바꿔요. ` : ""}
        {when}
      </p>

      <div className="mt-8 max-w-2xl space-y-4">
        <div className="rounded-3xl glass-card px-6 py-5">
          <div className="flex items-baseline justify-between">
            <div className="text-sm font-medium">{plan.name} 플랜 · 매월 자동결제</div>
            <div className="display text-xl font-semibold">
              {price}
              <span className="text-xs font-normal text-muted-foreground"> / 월</span>
            </div>
          </div>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            {[
              "만료 하루 전 오전 10시에 등록 카드로 결제하고, 성공하면 기존 만료일에 이어서 30일이 연장돼요.",
              "결제 3일 전에 '자동결제 예정' 알림을 보내 드려요.",
              "결제가 실패하면 만료 후 3일 동안 BUSINESS를 유지하며 매일 다시 시도해요. 그 안에 카드를 바꾸면 바로 결제돼요.",
              "해지하면 남은 기간까지 이용하고 더는 결제되지 않아요. 결제 후 환불은 고객센터로 문의해 주세요.",
            ].map((t) => (
              <li key={t} className="flex items-start gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-accent-ink" strokeWidth={2.5} />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
        <AutopayClient changing={changing} cta={changing ? "새 카드 등록하기" : graceNow || !activeBusiness ? `카드 등록하고 ${price} 결제하기` : "카드 등록하고 자동결제 켜기"} />
        <p className="text-center text-xs text-muted-foreground">
          카드 등록 없이 한 달만 쓰려면{" "}
          <Link href="/dashboard/billing/checkout" className="underline underline-offset-2">
            1개월 결제
          </Link>
          를 이용하세요.
        </p>
      </div>
    </div>
  );
}
