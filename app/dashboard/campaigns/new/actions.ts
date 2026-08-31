"use server";
import { trackServer } from "@/lib/analytics-server";
import { dbErrorWith } from "@/lib/db-errors";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { revalidatePublicCampaign } from "@/lib/cache/public-revalidate";
import { createClient } from "@/lib/supabase/server";
import { getEntitlements } from "@/lib/plans/entitlements";

export type CampaignDraft = {
  // Step 1
  title: string;
  business_name: string;
  industry_brief: string;
  thumbnail_url: string;
  contact_phone: string;
  region_id: string;

  // Step 2
  promotion_type_id: string;
  category_id: string;
  channel_type_ids: string[];
  missions: { channel_type_id: string; description: string }[];

  // Step 3
  recruit_start: string;
  recruit_end: string;
  experience_start: string | null;
  experience_end: string | null;
  same_day_reservation: boolean;
  always_open: boolean;
  schedules: { day_of_week: number; start_time: string; end_time: string }[];

  // Step 4
  recruit_count: number;
  keywords: string[];

  // Step 5
  offerings: { title: string; description: string; estimated_value: number | null }[];
  point_amount: number;
};

export type CampaignActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export async function createCampaign(
  draft: CampaignDraft,
  submit: boolean,
  /** 운영자 대행 등록: 이 광고주 명의로 생성. 운영자만 허용, 검수 요청 시 바로 모집중(운영자가 검수자) */
  onBehalfOf?: string | null
): Promise<CampaignActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  let ownerId = user.id;
  let operatorMode = false;
  if (onBehalfOf && onBehalfOf !== user.id) {
    const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (me?.role !== "operator") return { ok: false, error: "운영자만 다른 광고주 명의로 등록할 수 있습니다." };
    const { data: adv } = await supabase.from("profiles").select("id, role").eq("id", onBehalfOf).maybeSingle();
    if (!adv || adv.role !== "advertiser") return { ok: false, error: "광고주 계정을 찾을 수 없습니다." };
    ownerId = onBehalfOf;
    operatorMode = true;
  }

  // 플랜 제한: FREE는 캠페인 1건 (UI만이 아니라 서버에서도 차단) — 운영자 대행은 제한 없음
  const ent = await getEntitlements(ownerId);
  if (!operatorMode && ent.maxCampaigns !== null) {
    const { count } = await supabase
      .from("campaigns")
      .select("id", { count: "exact", head: true })
      .eq("advertiser_id", ownerId);
    if ((count ?? 0) >= ent.maxCampaigns) {
      return {
        ok: false,
        error: `${ent.planName} 플랜은 캠페인을 ${ent.maxCampaigns}건까지 등록할 수 있습니다. BUSINESS 플랜으로 업그레이드하면 무제한 등록이 가능합니다.`,
      };
    }
  }

  // 서버 측 방어 검증: 빈 문자열 날짜가 timestamptz 컬럼에 들어가면
  // Postgres가 "invalid input syntax for type timestamp" 오류를 낸다.
  if (!draft.recruit_start || !draft.recruit_end) {
    return { ok: false, error: "모집 기간(시작일·종료일)을 입력해주세요. (STEP 3 체험 일정)" };
  }

  // 1. Insert campaign root
  const { data: campaign, error: campErr } = await supabase
    .from("campaigns")
    .insert({
      advertiser_id: ownerId,
      region_id: draft.region_id,
      category_id: draft.category_id,
      promotion_type_id: draft.promotion_type_id,
      title: draft.title,
      business_name: draft.business_name,
      industry_brief: draft.industry_brief?.trim() || null,
      thumbnail_url: draft.thumbnail_url || null,
      contact_phone: draft.contact_phone || null,
      recruit_start: draft.recruit_start,
      recruit_end: draft.recruit_end,
      experience_start: draft.experience_start || null,
      experience_end: draft.experience_end || null,
      same_day_reservation: draft.same_day_reservation,
      always_open: draft.always_open,
      recruit_count: draft.recruit_count,
      point_amount: draft.point_amount,
      status: submit ? (operatorMode ? "open" : "pending_approval") : "draft",
      ...(operatorMode && submit ? { approved_at: new Date().toISOString(), approved_by: user.id } : {}),
    })
    .select("id")
    .single();

  if (campErr || !campaign) {
    return { ok: false, error: `캠페인 생성 실패: ${campErr?.message ?? "unknown"}` };
  }

  const campaignId = campaign.id;

  async function rollback(reason: string): Promise<CampaignActionResult> {
    await supabase.from("campaigns").delete().eq("id", campaignId);
    return { ok: false, error: reason };
  }

  // 2. Channels
  if (draft.channel_type_ids.length > 0) {
    const { error } = await supabase.from("campaign_channels").insert(
      draft.channel_type_ids.map((id) => ({
        campaign_id: campaignId,
        channel_type_id: id,
      }))
    );
    if (error) return rollback(dbErrorWith("채널 저장 실패", error));
  }

  // 3. Missions
  const validMissions = draft.missions.filter(
    (m) => m.description.trim().length > 0 && draft.channel_type_ids.includes(m.channel_type_id)
  );
  if (validMissions.length > 0) {
    const { error } = await supabase.from("campaign_missions").insert(
      validMissions.map((m) => ({
        campaign_id: campaignId,
        channel_type_id: m.channel_type_id,
        description: m.description.trim(),
      }))
    );
    if (error) return rollback(dbErrorWith("미션 저장 실패", error));
  }

  // 4. Keywords
  const cleanKeywords = [...new Set(draft.keywords.map((k) => k.trim()).filter(Boolean))];
  if (cleanKeywords.length > 0) {
    const { error } = await supabase.from("campaign_keywords").insert(
      cleanKeywords.map((k) => ({ campaign_id: campaignId, keyword: k }))
    );
    if (error) return rollback(dbErrorWith("키워드 저장 실패", error));
  }

  // 5. Offerings
  const validOfferings = draft.offerings.filter((o) => o.title.trim().length > 0);
  if (validOfferings.length > 0) {
    const { error } = await supabase.from("campaign_offerings").insert(
      validOfferings.map((o) => ({
        campaign_id: campaignId,
        title: o.title.trim(),
        description: o.description.trim() || null,
        estimated_value: o.estimated_value,
      }))
    );
    if (error) return rollback(dbErrorWith("제공내역 저장 실패", error));
  }

  // 6. Schedules
  if (draft.schedules.length > 0) {
    const { error } = await supabase.from("campaign_schedules").insert(
      draft.schedules.map((s) => ({
        campaign_id: campaignId,
        day_of_week: s.day_of_week,
        start_time: s.start_time || null,
        end_time: s.end_time || null,
      }))
    );
    if (error) return rollback(dbErrorWith("일정 저장 실패", error));
  }

  if (operatorMode) {
    await supabase.rpc("push_notification_self_safe", {
      p_user: ownerId,
      p_type: "operator_created_campaign",
      p_title: submit ? "운영자가 캠페인을 대신 등록하고 모집을 시작했어요" : "운영자가 캠페인 초안을 대신 작성했어요",
      p_body: `${draft.title} — 캠페인 상세에서 내용을 확인하세요. 수정이 필요하면 운영팀에 알려주세요.`,
      p_link: `/dashboard/campaigns/${campaignId}`,
    });
  }
  return { ok: true, id: campaignId };
}

export async function createCampaignAndRedirect(draft: CampaignDraft, submit: boolean, onBehalfOf?: string | null) {
  const result = await createCampaign(draft, submit, onBehalfOf);
  if (result.ok) {
    await trackServer("campaign_created", {
      mode: submit ? "submit" : "draft",
      ai: draft.industry_brief ? "yes" : "no",
    });
    redirect(`/dashboard/campaigns/${result.id}`);
  }
  return result;
}

/**
 * 캠페인 수정 — 초안·검수중·반려(취소) 상태에서만. 소유주 전용.
 * 하위 항목(채널·미션·키워드·제공·일정)은 교체. submit=true 면 검수 요청(pending_approval), false 면 초안 유지/복귀.
 */
export async function updateCampaign(
  campaignId: string,
  draft: CampaignDraft,
  submit: boolean
): Promise<CampaignActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data: existing } = await supabase
    .from("campaigns")
    .select("id, status, advertiser_id, title")
    .eq("id", campaignId)
    .maybeSingle();
  // 운영자는 오타·내용 정정을 위해 남의 캠페인도 수정할 수 있다 (2026-08-31 사장님 지시).
  // RLS(campaigns_operator_all)와 보호 트리거(is_operator 예외)는 이미 허용 — 앱 가드만 연다.
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const isOperatorEdit = me?.role === "operator" && existing?.advertiser_id !== user.id;
  if (!existing || (existing.advertiser_id !== user.id && !isOperatorEdit)) {
    return { ok: false, error: "캠페인을 찾을 수 없습니다." };
  }
  const editableStatuses = isOperatorEdit
    ? ["draft", "pending_approval", "cancelled", "rejected", "open"] // 운영자는 모집중 정정까지
    : ["draft", "pending_approval", "cancelled", "rejected"];
  if (!editableStatuses.includes(existing.status)) {
    return {
      ok: false,
      error: isOperatorEdit ? "마감·완료된 캠페인은 수정할 수 없습니다." : "모집이 시작된 캠페인은 수정할 수 없습니다. 복제해서 새로 만드세요.",
    };
  }
  if (!draft.recruit_start || !draft.recruit_end) {
    return { ok: false, error: "모집 기간(시작일·종료일)을 입력해주세요. (STEP 3 체험 일정)" };
  }

  const { error: upErr } = await supabase
    .from("campaigns")
    .update({
      region_id: draft.region_id,
      category_id: draft.category_id,
      promotion_type_id: draft.promotion_type_id,
      title: draft.title,
      business_name: draft.business_name,
      industry_brief: draft.industry_brief?.trim() || null,
      thumbnail_url: draft.thumbnail_url || null,
      contact_phone: draft.contact_phone || null,
      recruit_start: draft.recruit_start,
      recruit_end: draft.recruit_end,
      experience_start: draft.experience_start || null,
      experience_end: draft.experience_end || null,
      same_day_reservation: draft.same_day_reservation,
      always_open: draft.always_open,
      recruit_count: draft.recruit_count,
      point_amount: draft.point_amount,
      // 운영자 정정은 상태를 바꾸지 않는다 — 모집중 캠페인이 검수중/초안으로 내려가면 사고다
      status: isOperatorEdit ? existing.status : submit ? "pending_approval" : "draft",
    })
    .eq("id", campaignId);
  if (upErr) return { ok: false, error: dbErrorWith("캠페인 수정 실패", upErr) };

  // 하위 항목 교체
  await Promise.all([
    supabase.from("campaign_channels").delete().eq("campaign_id", campaignId),
    supabase.from("campaign_missions").delete().eq("campaign_id", campaignId),
    supabase.from("campaign_keywords").delete().eq("campaign_id", campaignId),
    supabase.from("campaign_offerings").delete().eq("campaign_id", campaignId),
    supabase.from("campaign_schedules").delete().eq("campaign_id", campaignId),
  ]);
  if (draft.channel_type_ids.length > 0) {
    const { error } = await supabase.from("campaign_channels").insert(draft.channel_type_ids.map((id) => ({ campaign_id: campaignId, channel_type_id: id })));
    if (error) return { ok: false, error: dbErrorWith("채널 저장 실패", error) };
  }
  const validMissions = draft.missions.filter((m) => m.description.trim() && draft.channel_type_ids.includes(m.channel_type_id));
  if (validMissions.length > 0) {
    const { error } = await supabase.from("campaign_missions").insert(validMissions.map((m) => ({ campaign_id: campaignId, channel_type_id: m.channel_type_id, description: m.description.trim() })));
    if (error) return { ok: false, error: dbErrorWith("미션 저장 실패", error) };
  }
  const cleanKeywords = [...new Set(draft.keywords.map((k) => k.trim()).filter(Boolean))];
  if (cleanKeywords.length > 0) {
    const { error } = await supabase.from("campaign_keywords").insert(cleanKeywords.map((k) => ({ campaign_id: campaignId, keyword: k })));
    if (error) return { ok: false, error: dbErrorWith("키워드 저장 실패", error) };
  }
  const validOfferings = draft.offerings.filter((o) => o.title.trim());
  if (validOfferings.length > 0) {
    const { error } = await supabase.from("campaign_offerings").insert(validOfferings.map((o) => ({ campaign_id: campaignId, title: o.title.trim(), description: o.description.trim() || null, estimated_value: o.estimated_value })));
    if (error) return { ok: false, error: dbErrorWith("제공내역 저장 실패", error) };
  }
  if (draft.schedules.length > 0) {
    const { error } = await supabase.from("campaign_schedules").insert(draft.schedules.map((s) => ({ campaign_id: campaignId, day_of_week: s.day_of_week, start_time: s.start_time || null, end_time: s.end_time || null })));
    if (error) return { ok: false, error: dbErrorWith("일정 저장 실패", error) };
  }

  // 운영자가 남의 캠페인을 고쳤으면 광고주에게 알리고, 공개 페이지 캐시도 갱신
  if (isOperatorEdit) {
    const { getAdminSupabase } = await import("@/lib/supabase/admin");
    await getAdminSupabase().from("notifications").insert({
      user_id: existing.advertiser_id,
      type: "campaign_edited_by_operator",
      title: "운영팀이 캠페인 내용을 정리했어요",
      body: `"${(existing.title ?? draft.title).slice(0, 60)}" 캠페인의 내용이 운영팀에 의해 수정됐습니다. 변경 내용을 확인해보세요.`,
      link: `/dashboard/campaigns/${campaignId}`,
    });
    revalidatePublicCampaign(campaignId);
  }

  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  revalidatePath("/dashboard/campaigns");
  return { ok: true, id: campaignId };
}
