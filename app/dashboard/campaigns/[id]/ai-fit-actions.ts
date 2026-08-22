"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { getEntitlements } from "@/lib/plans/entitlements";
import { evaluatePendingApplicants } from "@/lib/ai/applicant-fit-data";

type Result = { ok: true; scored: number; skipped: number } | { ok: false; error: string };

/**
 * 대기(pending) 응모자 AI 적합도 일괄 평가 — 본인 캠페인, BUSINESS 이상.
 * 미평가 응모자만(최대 30명/회, force 면 전체 재평가). 결과는 applications.ai_fit 에 캐시.
 */
export async function aiFitApplicants(campaignId: string, force = false): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data: camp } = await supabase
    .from("campaigns")
    .select("id, advertiser_id, title, business_name, industry_brief, category_id, region_id, promotion_type_id, point_amount, recruit_count")
    .eq("id", campaignId)
    .maybeSingle();
  if (!camp || camp.advertiser_id !== user.id) return { ok: false, error: "캠페인을 찾을 수 없습니다." };

  const ent = await getEntitlements(user.id);
  if (!ent.aiMatching) return { ok: false, error: "AI 적합도 평가는 BUSINESS 플랜부터 이용할 수 있어요." };

  const result = await evaluatePendingApplicants(supabase, camp, force);
  if (!result.ok) return result;

  const admin = getAdminSupabase();
  const now = new Date().toISOString();
  let scored = 0;
  for (const [id, fit] of result.results) {
    const { error } = await admin.from("applications").update({ ai_fit: JSON.parse(JSON.stringify(fit)), ai_fit_at: now }).eq("id", id);
    if (!error) scored++;
  }

  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  return { ok: true, scored, skipped: result.candidates - scored };
}
