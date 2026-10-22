import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { isSubscriptionActive } from "@/lib/plans/active";

export type PlanTier = "free" | "business" | "enterprise";

export type Entitlements = {
  tier: PlanTier;
  planName: string;
  /** null = 무제한 */
  maxCampaigns: number | null;
  /** null = 무제한 */
  maxApplicantViews: number | null;
  aiMatching: boolean;
};

const FREE: Entitlements = {
  tier: "free",
  planName: "FREE",
  maxCampaigns: 1,
  maxApplicantViews: 10,
  aiMatching: false,
};

const UNLIMITED: Omit<Entitlements, "tier" | "planName"> = {
  maxCampaigns: null,
  maxApplicantViews: null,
  aiMatching: true,
};

/**
 * 광고주의 현재 플랜 권한 조회.
 * - 구독이 없거나 active가 아니면 FREE
 * - BUSINESS라도 expires_at이 지났으면 FREE로 강등 — 자동결제 실패 유예(grace_until) 중이면 유지
 * - React cache()로 요청 단위 메모이즈
 */
export const getEntitlements = cache(async (advertiserId: string): Promise<Entitlements> => {
  const supabase = await createClient();
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("status, expires_at, grace_until, plans(name, tier)")
    .eq("advertiser_id", advertiserId)
    .maybeSingle();

  const plan = sub?.plans as { name: string; tier: string } | null;
  if (!sub || sub.status !== "active" || !plan) return FREE;

  if (!isSubscriptionActive(sub)) return FREE; // 만료(자동결제 유예 중이면 유지)

  if (plan.tier === "business" || plan.tier === "enterprise") {
    return { tier: plan.tier, planName: plan.name, ...UNLIMITED };
  }
  return FREE;
});
