"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Precheck } from "@/lib/ai/campaign-precheck";

async function ensureOperator() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "로그인이 필요합니다.", supabase, user: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "operator") {
    return { ok: false as const, error: "권한이 없습니다.", supabase, user };
  }
  return { ok: true as const, supabase, user };
}

export async function approveUser(
  profileId: string,
  decision: "approve" | "reject"
): Promise<{ ok: true } | { ok: false; error: string }> {
  const guard = await ensureOperator();
  if (!guard.ok) return { ok: false, error: guard.error };

  if (decision === "approve") {
    const { error } = await guard.supabase
      .from("profiles")
      .update({
        approved: true,
        approved_at: new Date().toISOString(),
        approved_by: guard.user.id,
      })
      .eq("id", profileId);
    if (error) return { ok: false, error: error.message };
  } else {
    // For reject, we just leave them unapproved. In real product we'd flag/email them.
    const { error } = await guard.supabase
      .from("profiles")
      .update({ approved: false })
      .eq("id", profileId);
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard/operator/users");
  revalidatePath("/dashboard");
  return { ok: true };
}

/**
 * 회원 일괄 승인 — 승인 대기 탭에서 체크한 회원을 한 번에.
 * 최대 100명, 이미 승인된 행은 건드리지 않음 (approved=false 조건).
 */
export async function approveUsersBulk(
  profileIds: string[]
): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  const guard = await ensureOperator();
  if (!guard.ok) return { ok: false, error: guard.error };

  const ids = [...new Set(profileIds)].filter(Boolean).slice(0, 100);
  if (ids.length === 0) return { ok: false, error: "선택된 회원이 없습니다." };

  const { data, error } = await guard.supabase
    .from("profiles")
    .update({
      approved: true,
      approved_at: new Date().toISOString(),
      approved_by: guard.user.id,
    })
    .in("id", ids)
    .eq("approved", false)
    .neq("role", "operator")
    .select("id");
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/operator/users");
  revalidatePath("/dashboard");
  return { ok: true, count: data?.length ?? 0 };
}

export async function decideCampaign(
  campaignId: string,
  decision: "open" | "rejected"
): Promise<{ ok: true } | { ok: false; error: string }> {
  const guard = await ensureOperator();
  if (!guard.ok) return { ok: false, error: guard.error };

  const status = decision === "open" ? "open" : "cancelled";
  const { error } = await guard.supabase
    .from("campaigns")
    .update({
      status,
      approved_at: new Date().toISOString(),
      approved_by: guard.user.id,
    })
    .eq("id", campaignId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/operator/campaigns");
  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  return { ok: true };
}

// 출금 처리는 SECURITY DEFINER 함수가 운영자 권한 검증 + 지급/환불을 원자적으로 수행
export async function processWithdrawal(
  withdrawalId: string,
  approve: boolean,
  rejectReason?: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const guard = await ensureOperator();
  if (!guard.ok) return { ok: false, error: guard.error };

  const { error } = await guard.supabase.rpc("process_point_withdrawal", {
    p_withdrawal_id: withdrawalId,
    p_approve: approve,
    p_reject_reason: rejectReason?.trim().slice(0, 500),
  });

  if (error) {
    return { ok: false, error: "처리에 실패했습니다. 이미 처리된 신청인지 확인해주세요." };
  }

  revalidatePath("/dashboard/operator/withdrawals");
  revalidatePath("/dashboard/points");
  return { ok: true };
}

/** 운영자: 캠페인 AI 사전 점검 실행 → 결과를 campaigns.ai_precheck 에 저장 */
export async function precheckCampaignAction(
  campaignId: string,
  force = false
): Promise<{ ok: true; result: Precheck; checkedAt: string } | { ok: false; error: string }> {
  const guard = await ensureOperator();
  if (!guard.ok) return { ok: false, error: guard.error };
  const supabase = guard.supabase;

  const { data: c } = await supabase
    .from("campaigns")
    .select("id, title, business_name, industry_brief, point_amount, recruit_count, recruit_start, recruit_end, category_id, promotion_type_id, ai_precheck, ai_prechecked_at")
    .eq("id", campaignId)
    .maybeSingle();
  if (!c) return { ok: false, error: "캠페인을 찾을 수 없습니다." };
  if (!force && c.ai_precheck && c.ai_prechecked_at) {
    return { ok: true, result: c.ai_precheck as Precheck, checkedAt: c.ai_prechecked_at };
  }

  const [{ data: ms }, { data: kw }, { data: of }, { data: cat }, { data: pt }] = await Promise.all([
    supabase.from("campaign_missions").select("description, channel_types(name)").eq("campaign_id", campaignId),
    supabase.from("campaign_keywords").select("keyword").eq("campaign_id", campaignId),
    supabase.from("campaign_offerings").select("title, description, estimated_value").eq("campaign_id", campaignId),
    c.category_id ? supabase.from("categories").select("name").eq("id", c.category_id).maybeSingle() : Promise.resolve({ data: null }),
    c.promotion_type_id ? supabase.from("promotion_types").select("name").eq("id", c.promotion_type_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  type Named = { name: string } | { name: string }[] | null;
  const nameOf = (n: Named) => (Array.isArray(n) ? n[0]?.name : n?.name) ?? "";
  const days = Math.max(1, Math.round((new Date(c.recruit_end).getTime() - new Date(c.recruit_start).getTime()) / 864e5));

  const { precheckCampaign } = await import("@/lib/ai/campaign-precheck");
  const r = await precheckCampaign({
    title: c.title,
    businessName: c.business_name,
    industryBrief: c.industry_brief,
    category: cat?.name ?? null,
    promotionType: pt?.name ?? null,
    missions: (ms ?? []).map((m) => ({ channel: nameOf(m.channel_types as Named), description: m.description })),
    keywords: (kw ?? []).map((k) => k.keyword),
    offerings: (of ?? []).map((o) => ({ title: o.title, description: o.description, estimatedValue: o.estimated_value })),
    pointAmount: c.point_amount,
    recruitCount: c.recruit_count,
    recruitDays: days,
  });
  if (!r.ok) return r;
  const checkedAt = new Date().toISOString();
  await supabase.from("campaigns").update({ ai_precheck: r.result, ai_prechecked_at: checkedAt }).eq("id", campaignId);
  return { ok: true, result: r.result, checkedAt };
}
