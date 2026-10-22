/**
 * 월 구독(정기결제) 안내 — 결제 페이지의 방식 선택과 자동결제(카드 변경) 페이지가 함께 쓴다. 서버 전용(service_role 로 본인 카드 조회).
 * 지금 결제가 일어나는지(첫 결제·유예 중 재결제) 아니면 다음 갱신부터인지에 따라 안내 문구와 버튼이 달라진다.
 */
import { getAdminSupabase } from "@/lib/supabase/admin";
import { isBillingConfigured } from "@/lib/payments/toss";
import { isSubscriptionActive } from "@/lib/plans/active";
import { planPrices, won, type PlanPrices } from "@/lib/payments/prices";

export type AutopayOffer =
  | { available: false; reason: string }
  | {
      available: true;
      planName: string;
      prices: PlanPrices;
      /** 등록하면 무엇이 일어나는지 한 문장 */
      when: string;
      cta: string;
      cardLabel: string | null;
      /** 이미 자동결제가 켜져 있음(정기결제 선택지는 안내만) */
      autoRenewOn: boolean;
    };

const kst = (iso: string) => new Date(iso).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric" });

export async function getAutopayOffer(advertiserId: string): Promise<AutopayOffer> {
  if (!isBillingConfigured()) return { available: false, reason: "정기결제 준비 중이에요." };
  const admin = getAdminSupabase();
  const [{ data: plan }, { data: sub }, { data: card }] = await Promise.all([
    admin.from("plans").select("name, monthly_price, list_price, one_time_amount, subscription_amount").eq("tier", "business").single(),
    admin.from("subscriptions").select("status, expires_at, grace_until, auto_renew, plans(tier)").eq("advertiser_id", advertiserId).maybeSingle(),
    admin.from("billing_methods").select("card_company, card_number").eq("advertiser_id", advertiserId).eq("status", "active").maybeSingle(),
  ]);
  if (!plan) return { available: false, reason: "플랜 정보를 찾을 수 없습니다." };

  const tier = (sub?.plans as { tier: string } | null)?.tier ?? "free";
  if (tier === "enterprise" && isSubscriptionActive(sub)) return { available: false, reason: "ENTERPRISE 플랜은 담당자와 별도 계약으로 결제해요." };

  const now = Date.now();
  const grace = !!sub?.expires_at && new Date(sub.expires_at).getTime() <= now && !!sub.grace_until && new Date(sub.grace_until).getTime() > now;
  const activeBusiness = tier === "business" && !!sub?.expires_at && new Date(sub.expires_at).getTime() > now;
  const prices = planPrices(plan);
  const price = `${won(prices.subscription)}(부가세 포함)`; // 실제 결제 금액
  const cardLabel = card ? [card.card_company, card.card_number].filter(Boolean).join(" ") || "등록 카드" : null;

  const when = grace
    ? `카드를 등록하면 밀린 이번 달 이용료 ${price}을 바로 결제하고, 기존 만료일에 이어서 30일이 연장돼요.`
    : activeBusiness
      ? `지금은 결제하지 않아요. 현재 이용 기간이 끝나기 하루 전(${kst(new Date(new Date(sub!.expires_at!).getTime() - 86_400_000).toISOString())})부터 매월 ${price}이 자동결제돼요.`
      : `카드를 등록하면 첫 달 이용료 ${price}을 바로 결제하고 오늘부터 30일간 ${plan.name} 혜택이 적용돼요. 이후 매월 자동결제돼요.`;

  return {
    available: true,
    planName: plan.name,
    prices,
    when,
    cta: card ? "새 카드 등록하기" : grace || !activeBusiness ? `카드 등록하고 ${won(prices.subscription)} 결제하기` : "카드 등록하고 정기결제 시작",
    cardLabel,
    autoRenewOn: !!sub?.auto_renew && (activeBusiness || grace) && !!card,
  };
}
