"use server";

import { revalidatePath } from "next/cache";
import { authErrorMessage } from "@/lib/auth-errors";
import { dbErrorMessage, dbErrorWith } from "@/lib/db-errors";
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
    if (error) return { ok: false, error: dbErrorMessage(error) };
  } else {
    // For reject, we just leave them unapproved. In real product we'd flag/email them.
    const { error } = await guard.supabase
      .from("profiles")
      .update({ approved: false })
      .eq("id", profileId);
    if (error) return { ok: false, error: dbErrorMessage(error) };
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
  if (error) return { ok: false, error: dbErrorMessage(error) };

  revalidatePath("/dashboard/operator/users");
  revalidatePath("/dashboard");
  return { ok: true, count: data?.length ?? 0 };
}

export async function decideCampaign(
  campaignId: string,
  decision: "open" | "rejected",
  /** 반려 시 수정 요청 사항(광고주에게 전달). 10자 이상 필수 */
  note?: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const guard = await ensureOperator();
  if (!guard.ok) return { ok: false, error: guard.error };

  const now = new Date().toISOString();
  let error: { message: string } | null = null;
  if (decision === "open") {
    ({ error } = await guard.supabase
      .from("campaigns")
      .update({ status: "open", approved_at: now, approved_by: guard.user.id, reviewed_at: now, reviewed_by: guard.user.id, review_note: null })
      .eq("id", campaignId));
  } else {
    const text = (note ?? "").trim();
    if (text.length < 10) return { ok: false, error: "반려 사유(수정 요청 사항)를 10자 이상 적어주세요. 광고주가 그대로 받아봅니다." };
    ({ error } = await guard.supabase
      .from("campaigns")
      .update({ status: "rejected", review_note: text.slice(0, 2000), reviewed_at: now, reviewed_by: guard.user.id })
      .eq("id", campaignId));
  }
  if (error) return { ok: false, error: dbErrorMessage(error) };

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

  const { runCampaignPrecheck } = await import("@/lib/ai/precheck-run");
  return runCampaignPrecheck(supabase, campaignId, { userId: guard.user?.id ?? null });
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
  if (error) return { ok: false as const, error: dbErrorMessage(error) };
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
  if (error) return { ok: false as const, error: dbErrorMessage(error) };
  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  const r = data as { assigned: number; skipped: { id: string; reason: string }[] };
  return { ok: true as const, assigned: r.assigned, skipped: r.skipped ?? [] };
}

/**
 * 운영자: 회원 추가(초대). Supabase Admin API 로 계정 생성 + 초대 메일(비밀번호 설정 링크).
 * 역할별 메타데이터를 넣어 handle_new_user 트리거가 프로필/광고주·크리에이터 행을 생성한다.
 * 크리에이터는 운영자가 만든 것이므로 바로 승인. 초대 메일 발송이 실패해도 계정은 생성됨(비밀번호 재설정으로 안내 가능).
 */
/**
 * 아직 로그인한 적 없는 회원에게 비밀번호 설정 메일을 다시 보낸다.
 * (일괄 등록으로 만든 계정은 확인 메일이 나가지 않아 사용자가 들어올 방법이 없다)
 */
export async function resendInvite(profileId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const guard = await ensureOperator();
  if (!guard.ok) return { ok: false, error: guard.error };
  const { data: profile } = await guard.supabase.from("profiles").select("email, name").eq("id", profileId).maybeSingle();
  if (!profile?.email) return { ok: false, error: "회원을 찾을 수 없어요." };

  const { getAdminSupabase } = await import("@/lib/supabase/admin");
  const admin = getAdminSupabase();
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://luby.im").replace(/\/$/, "");
  // 이미 계정이 있으므로 초대가 아니라 "비밀번호 설정(복구)" 메일을 보낸다
  const { error } = await admin.auth.resetPasswordForEmail(profile.email, { redirectTo: `${site}/reset-password` });
  if (error) return { ok: false, error: authErrorMessage(error, "메일 발송에 실패했어요. 잠시 후 다시 시도해 주세요.") };

  await guard.supabase.from("member_notes").insert({ profile_id: profileId, author_id: guard.user.id, body: "비밀번호 설정 메일 재발송" });
  revalidatePath("/dashboard/operator/users");
  return { ok: true };
}

export async function inviteMember(input: {
  email: string;
  name: string;
  role: "advertiser" | "influencer";
  advertiserKind?: "brand" | "agency";
  companyName?: string;
  businessNumber?: string;
  regionId?: string | null;
  channelTypeId?: string | null;
  channelUrl?: string;
  categoryIds?: string[];
  phone?: string;
  /** invite = 초대 메일(비밀번호 설정 링크) · temp = 임시 비밀번호 자동 생성 · manual = 운영자가 비밀번호 직접 지정 */
  mode?: "invite" | "temp" | "manual";
  password?: string;
  /** 하위 호환 */
  sendInvite?: boolean;
}): Promise<{ ok: true; id: string; invited: boolean; tempPassword?: string } | { ok: false; error: string }> {
  const guard = await ensureOperator();
  if (!guard.ok) return { ok: false, error: guard.error };
  const email = input.email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, error: "이메일 형식이 올바르지 않습니다." };
  if (!input.name.trim()) return { ok: false, error: "이름을 입력하세요." };
  if (input.role === "advertiser" && !input.companyName?.trim()) return { ok: false, error: "회사·상호명(대행사명)을 입력하세요." };
  if (input.role === "advertiser") {
    const d0 = (input.businessNumber ?? "").replace(/-/g, "");
    if (!/^\d{10}$/.test(d0)) return { ok: false, error: "사업자등록번호는 숫자 10자리로 입력해주세요. (예: 123-45-67890)" };
  }

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
  } else {
    if (input.regionId) meta.region_id = input.regionId;
    if (input.channelTypeId && input.channelUrl?.trim()) {
      meta.channel_type_id = input.channelTypeId;
      meta.channel_url = input.channelUrl.trim();
    }
    if (input.categoryIds?.length) meta.category_ids = input.categoryIds.slice(0, 3).join(",");
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://luby.im";
  const mode: "invite" | "temp" | "manual" = input.mode ?? (input.sendInvite === false ? "temp" : "invite");
  let userId: string | null = null;
  let invited = false;
  let tempPassword: string | undefined;

  if (mode === "manual") {
    const pwd = input.password ?? "";
    if (pwd.length < 8) return { ok: false, error: "비밀번호는 8자 이상이어야 합니다." };
    if (!/[0-9]/.test(pwd) || !/[A-Za-z]/.test(pwd)) return { ok: false, error: "비밀번호는 영문과 숫자를 포함해야 합니다." };
    const { data, error } = await admin.auth.admin.createUser({ email, password: pwd, email_confirm: true, user_metadata: meta });
    if (error) return { ok: false, error: dbErrorWith("생성 실패", error) };
    userId = data.user.id;
  } else if (mode === "invite") {
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, { data: meta, redirectTo: `${siteUrl}/reset-password` });
    if (error) return { ok: false, error: dbErrorWith("초대 실패", error) };
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
    if (error) return { ok: false, error: dbErrorWith("생성 실패", error) };
    userId = data.user.id;
  }

  if (input.role === "influencer" && userId) {
    await admin.from("profiles").update({ approved: true, approved_at: new Date().toISOString(), approved_by: guard.user.id }).eq("id", userId);
  }
  await guard.supabase.rpc("push_notification_self_safe", {
    p_user: guard.user.id,
    p_type: "operator_notice",
    p_title: `회원 추가 완료 — ${input.name.trim()}`,
    p_body: `${email} (${input.role === "advertiser" ? (input.advertiserKind === "agency" ? "대행사" : "광고주") : "크리에이터"})${invited ? " · 초대 메일 발송" : mode === "manual" ? " · 비밀번호 직접 지정" : " · 임시 비밀번호 생성"}`,
    p_link: "/dashboard/operator/users?filter=all",
  });
  revalidatePath("/dashboard/operator/users");
  return { ok: true, id: userId!, invited, tempPassword };
}

/** 운영자: 회원 메모 추가 */
export async function addMemberNote(profileId: string, body: string, pinned = false) {
  const guard = await ensureOperator();
  if (!guard.ok) return { ok: false as const, error: guard.error };
  const text = body.trim();
  if (!text) return { ok: false as const, error: "메모 내용을 입력하세요." };
  const { error } = await guard.supabase.from("member_notes").insert({ profile_id: profileId, author_id: guard.user.id, body: text.slice(0, 2000), pinned });
  if (error) return { ok: false as const, error: dbErrorMessage(error) };
  revalidatePath(`/dashboard/operator/users/${profileId}`);
  return { ok: true as const };
}
/** 운영자: 회원 메모 삭제 (작성자 본인 또는 아무 운영자) */
export async function deleteMemberNote(noteId: string, profileId: string) {
  const guard = await ensureOperator();
  if (!guard.ok) return { ok: false as const, error: guard.error };
  const { error } = await guard.supabase.from("member_notes").delete().eq("id", noteId);
  if (error) return { ok: false as const, error: dbErrorMessage(error) };
  revalidatePath(`/dashboard/operator/users/${profileId}`);
  return { ok: true as const };
}
/** 운영자: 회원 태그 설정 */
export async function setMemberTags(profileId: string, tags: string[]) {
  const guard = await ensureOperator();
  if (!guard.ok) return { ok: false as const, error: guard.error };
  const { data, error } = await guard.supabase.rpc("set_member_tags", { p_profile_id: profileId, p_tags: tags });
  if (error) return { ok: false as const, error: dbErrorMessage(error) };
  revalidatePath(`/dashboard/operator/users/${profileId}`);
  revalidatePath("/dashboard/operator/users");
  return { ok: true as const, tags: (data ?? []) as string[] };
}

/** 운영자: 세금계산서 발행 완료 처리 (홈택스/API 로 발행 후 표시 → 광고주 알림·감사 로그) */
export async function markTaxInvoiceIssued(paymentId: string, note?: string) {
  const guard = await ensureOperator();
  if (!guard.ok) return { ok: false as const, error: guard.error };
  const { error } = await guard.supabase.rpc("mark_tax_invoice_issued", { p_payment_id: paymentId, p_note: note?.trim() || null });
  if (error) return { ok: false as const, error: dbErrorMessage(error) };
  revalidatePath("/dashboard/operator/payments");
  return { ok: true as const };
}

/** 대량 등록 1단계: 파일 파싱·검증 미리보기 (생성 안 함) */
export async function previewMemberImport(formData: FormData) {
  const guard = await ensureOperator();
  if (!guard.ok) return { ok: false as const, error: guard.error };
  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false as const, error: "파일을 선택하세요." };
  if (file.size > 2 * 1024 * 1024) return { ok: false as const, error: "파일은 2MB 이하여야 합니다." };
  const [{ data: regions }, { data: channelTypes }, { data: categories }] = await Promise.all([
    guard.supabase.from("regions").select("id, name").eq("active", true),
    guard.supabase.from("channel_types").select("id, name, slug").eq("active", true),
    guard.supabase.from("categories").select("id, name").eq("active", true),
  ]);
  const { parseMemberFile } = await import("@/lib/member-import");
  const parsed = parseMemberFile(await file.arrayBuffer(), { regions: regions ?? [], channelTypes: channelTypes ?? [], categories: categories ?? [] });
  if (parsed.headerError) return { ok: false as const, error: parsed.headerError };
  // 기존 가입 이메일 표시
  const emails = parsed.rows.map((r) => r.email).filter(Boolean);
  const { data: existing } = emails.length ? await guard.supabase.from("profiles").select("email").in("email", emails) : { data: [] };
  const exists = new Set((existing ?? []).map((e) => e.email.toLowerCase()));
  for (const r of parsed.rows) if (exists.has(r.email)) r.errors.push("이미 가입된 이메일");
  if (parsed.rows.length > 300) return { ok: false as const, error: "한 번에 300명까지 등록할 수 있습니다." };
  return { ok: true as const, rows: parsed.rows };
}

/** 대량 등록 2단계: 검증 통과 행 생성. mode 는 비밀번호 열이 비어 있는 행에 적용 */
export async function commitMemberImport(rows: import("@/lib/member-import").ImportRow[], mode: "invite" | "temp") {
  const guard = await ensureOperator();
  if (!guard.ok) return { ok: false as const, error: guard.error };
  const results: { email: string; name: string; role: string; status: "created" | "invited" | "failed"; password?: string; error?: string }[] = [];
  for (const r of rows) {
    if (r.errors.length || !r.role) { results.push({ email: r.email, name: r.name, role: r.role ?? "", status: "failed", error: r.errors.join("; ") }); continue; }
    const res = await inviteMember({
      email: r.email, name: r.name, role: r.role, advertiserKind: r.advertiserKind, companyName: r.companyName, businessNumber: r.businessNumber,
      regionId: r.regionId, channelTypeId: r.channelTypeId, channelUrl: r.channelUrl, categoryIds: r.categoryIds, phone: r.phone,
      mode: r.password ? "manual" : mode, password: r.password || undefined,
    });
    if (!res.ok) results.push({ email: r.email, name: r.name, role: r.role, status: "failed", error: res.error });
    else results.push({ email: r.email, name: r.name, role: r.role === "advertiser" ? (r.advertiserKind === "agency" ? "대행사" : "광고주") : "크리에이터", status: res.invited ? "invited" : "created", password: res.tempPassword ?? (r.password || undefined) });
  }
  await guard.supabase.rpc("push_notification_self_safe", {
    p_user: guard.user.id, p_type: "operator_notice",
    p_title: `대량 등록 완료 — 성공 ${results.filter((x) => x.status !== "failed").length} · 실패 ${results.filter((x) => x.status === "failed").length}`,
    p_body: "회원 관리에서 확인하세요.", p_link: "/dashboard/operator/users?filter=all",
  });
  revalidatePath("/dashboard/operator/users");
  return { ok: true as const, results };
}
