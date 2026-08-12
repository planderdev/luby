import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

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
 * - BUSINESS라도 expires_at이 지났으면 FREE로 강등 (자동 갱신 결제 도입 전까지의 안전장치)
 * - React cache()로 요청 단위 메모이즈
 */
export const getEntitlements = cache(async (advertiserId: string): Promise<Entitlements> => {
  const supabase = await createClient();
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("status, expires_at, plans(name, tier)")
    .eq("advertiser_id", advertiserId)
    .maybeSingle();

  const plan = sub?.plans as { name: string; tier: string } | null;
  if (!sub || sub.status !== "active" || !plan) return FREE;

  const expired = sub.expires_at !== null && new Date(sub.expires_at).getTime() < Date.now();
  if (expired) return FREE;

  if (plan.tier === "business" || plan.tier === "enterprise") {
    return { tier: plan.tier, planName: plan.name, ...UNLIMITED };
  }
  return FREE;
});
