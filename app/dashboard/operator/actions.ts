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

/** 운영자: 캠페인 강제 매칭용 크리에이터 검색 */
export async function searchCreatorsForCampaign(campaignId: string, query: string) {
  const guard = await ensureOperator();
  if (!guard.ok) return { ok: false as const, error: guard.error };
  const { data, error } = await guard.supabase.rpc("operator_search_creators_for_campaign", {
    p_campaign_id: campaignId,
    p_query: query.trim() || null,
    p_limit: 20,
  });
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, rows: data ?? [] };
}

/** 운영자: 캠페인에 크리에이터 강제 배정(선정) */
export async function forceMatchCreators(campaignId: string, influencerIds: string[], note?: string) {
  const guard = await ensureOperator();
  if (!guard.ok) return { ok: false as const, error: guard.error };
  if (influencerIds.length === 0) return { ok: false as const, error: "배정할 크리에이터를 선택하세요." };
  const { data, error } = await guard.supabase.rpc("operator_force_match", {
    p_campaign_id: campaignId,
    p_influencer_ids: influencerIds,
    p_note: note?.trim() || null,
  });
  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  const r = data as { assigned: number; skipped: { id: string; reason: string }[] };
  return { ok: true as const, assigned: r.assigned, skipped: r.skipped ?? [] };
}

/**
 * 운영자: 회원 추가(초대). Supabase Admin API 로 계정 생성 + 초대 메일(비밀번호 설정 링크).
 * 역할별 메타데이터를 넣어 handle_new_user 트리거가 프로필/광고주·크리에이터 행을 생성한다.
 * 크리에이터는 운영자가 만든 것이므로 바로 승인. 초대 메일 발송이 실패해도 계정은 생성됨(비밀번호 재설정으로 안내 가능).
 */
export async function inviteMember(input: {
  email: string;
  name: string;
  role: "advertiser" | "influencer";
  advertiserKind?: "brand" | "agency";
  companyName?: string;
  businessNumber?: string;
  regionId?: string | null;
  phone?: string;
  sendInvite?: boolean;
}): Promise<{ ok: true; id: string; invited: boolean; tempPassword?: string } | { ok: false; error: string }> {
  const guard = await ensureOperator();
  if (!guard.ok) return { ok: false, error: guard.error };
  const email = input.email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, error: "이메일 형식이 올바르지 않습니다." };
  if (!input.name.trim()) return { ok: false, error: "이름을 입력하세요." };
  if (input.role === "advertiser" && !input.companyName?.trim()) return { ok: false, error: "회사·상호명(대행사명)을 입력하세요." };

  const { getAdminSupabase } = await import("@/lib/supabase/admin");
  const admin = getAdminSupabase();
  const { data: exists } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
  if (exists) return { ok: false, error: "이미 가입된 이메일입니다." };

  const meta: Record<string, string> = { role: input.role, name: input.name.trim() };
  if (input.phone?.trim()) meta.phone = input.phone.trim();
  if (input.role === "advertiser") {
    meta.company_name = input.companyName!.trim();
    meta.advertiser_kind = input.advertiserKind === "agency" ? "agency" : "brand";
    const d = (input.businessNumber ?? "").replace(/-/g, "");
    if (d) {
      if (!/^\d{10}$/.test(d)) return { ok: false, error: "사업자등록번호는 숫자 10자리여야 합니다." };
      meta.business_number = `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
    }
  } else if (input.regionId) {
    meta.region_id = input.regionId;
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://luby.im";
  const sendInvite = input.sendInvite !== false;
  let userId: string | null = null;
  let invited = false;
  let tempPassword: string | undefined;

  if (sendInvite) {
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, { data: meta, redirectTo: `${siteUrl}/reset-password` });
    if (error) return { ok: false, error: `초대 실패: ${error.message}` };
    userId = data.user.id;
    invited = true;
  } else {
    // 초대 메일 없이 임시 비밀번호로 생성 (운영자가 직접 전달)
    const { randomBytes } = await import("node:crypto");
    const alpha = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
    const b = randomBytes(14);
    let s = "";
    for (const x of b) s += alpha[x % alpha.length];
    tempPassword = `${s.slice(0, 5)}-${s.slice(5, 10)}-${s.slice(10)}!`;
    const { data, error } = await admin.auth.admin.createUser({ email, password: tempPassword, email_confirm: true, user_metadata: meta });
    if (error) return { ok: false, error: `생성 실패: ${error.message}` };
    userId = data.user.id;
  }

  if (input.role === "influencer" && userId) {
    await admin.from("profiles").update({ approved: true, approved_at: new Date().toISOString(), approved_by: guard.user.id }).eq("id", userId);
  }
  await guard.supabase.rpc("push_notification_self_safe", {
    p_user: guard.user.id,
    p_type: "operator_notice",
    p_title: `회원 추가 완료 — ${input.name.trim()}`,
    p_body: `${email} (${input.role === "advertiser" ? (input.advertiserKind === "agency" ? "대행사" : "광고주") : "크리에이터"})${invited ? " · 초대 메일 발송" : " · 임시 비밀번호 생성"}`,
    p_link: "/dashboard/operator/users?filter=all",
  });
  revalidatePath("/dashboard/operator/users");
  return { ok: true, id: userId!, invited, tempPassword };
}
