import { getAdminSupabase } from "@/lib/supabase/admin";

/**
 * 계정별 월간 AI 호출 한도 (사장님 결정 2026-08-22: BUSINESS 월 300회, 초과 시 안내).
 * FREE 는 캠페인 빌더 AI 만 쓰므로 30회, ENTERPRISE·운영자는 무제한. 달력 월(KST) 기준, 성공한 호출만 집계.
 */
export const AI_MONTHLY_LIMIT: Record<"free" | "business" | "enterprise" | "operator", number | null> = {
  free: 30,
  business: 300,
  enterprise: null,
  operator: null,
};

export class AiQuotaExceededError extends Error {
  constructor(public readonly used: number, public readonly limit: number) {
    super(`이번 달 AI 사용 한도(${limit}회)를 모두 사용했어요. 다음 달 1일에 초기화되며, 더 필요하시면 contact@plander.io 로 문의해주세요.`);
    this.name = "AiQuotaExceededError";
  }
}

export type AiQuota = { tier: keyof typeof AI_MONTHLY_LIMIT; used: number; limit: number | null; remaining: number | null };

/** 사용자의 플랜 티어 (쿠키 없는 컨텍스트용 — service_role 조회) */
export async function resolveAiTier(userId: string): Promise<AiQuota["tier"]> {
  const admin = getAdminSupabase();
  const [{ data: profile }, { data: sub }] = await Promise.all([
    admin.from("profiles").select("role").eq("id", userId).maybeSingle(),
    admin.from("subscriptions").select("status, expires_at, plans(tier)").eq("advertiser_id", userId).maybeSingle(),
  ]);
  if (profile?.role === "operator") return "operator";
  const tier = (sub?.plans as { tier: string } | null)?.tier;
  const active = sub?.status === "active" && (!sub.expires_at || new Date(sub.expires_at).getTime() > Date.now());
  if (active && tier === "enterprise") return "enterprise";
  if (active && tier === "business") return "business";
  return "free";
}

export async function getAiQuota(userId: string): Promise<AiQuota> {
  const admin = getAdminSupabase();
  const [tier, { count }] = await Promise.all([
    resolveAiTier(userId),
    admin
      .from("ai_usage")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("ok", true)
      .gte("created_at", monthStartKstIso()),
  ]);
  const limit = AI_MONTHLY_LIMIT[tier];
  const used = count ?? 0;
  return { tier, used, limit, remaining: limit === null ? null : Math.max(0, limit - used) };
}

/** 한도 초과 시 AiQuotaExceededError 를 던진다 (trackedCreate 에서 호출) */
export async function assertAiQuota(userId: string): Promise<void> {
  const q = await getAiQuota(userId);
  if (q.limit !== null && q.used >= q.limit) throw new AiQuotaExceededError(q.used, q.limit);
}

function monthStartKstIso(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 3600 * 1000);
  const start = new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), 1, 0, 0, 0) - 9 * 3600 * 1000);
  return start.toISOString();
}
