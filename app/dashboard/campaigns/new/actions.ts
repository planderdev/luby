"use server";
import { trackServer } from "@/lib/analytics-server";

import { redirect } from "next/navigation";
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
  submit: boolean
): Promise<CampaignActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  // 플랜 제한: FREE는 캠페인 1건 (UI만이 아니라 서버에서도 차단)
  const ent = await getEntitlements(user.id);
  if (ent.maxCampaigns !== null) {
    const { count } = await supabase
      .from("campaigns")
      .select("id", { count: "exact", head: true })
      .eq("advertiser_id", user.id);
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
      advertiser_id: user.id,
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
      status: submit ? "pending_approval" : "draft",
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
    if (error) return rollback(`채널 저장 실패: ${error.message}`);
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
    if (error) return rollback(`미션 저장 실패: ${error.message}`);
  }

  // 4. Keywords
  const cleanKeywords = [...new Set(draft.keywords.map((k) => k.trim()).filter(Boolean))];
  if (cleanKeywords.length > 0) {
    const { error } = await supabase.from("campaign_keywords").insert(
      cleanKeywords.map((k) => ({ campaign_id: campaignId, keyword: k }))
    );
    if (error) return rollback(`키워드 저장 실패: ${error.message}`);
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
    if (error) return rollback(`제공내역 저장 실패: ${error.message}`);
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
    if (error) return rollback(`일정 저장 실패: ${error.message}`);
  }

  return { ok: true, id: campaignId };
}

export async function createCampaignAndRedirect(draft: CampaignDraft, submit: boolean) {
  const result = await createCampaign(draft, submit);
  if (result.ok) {
    await trackServer("campaign_created", {
      mode: submit ? "submit" : "draft",
      ai: draft.industry_brief ? "yes" : "no",
    });
    redirect(`/dashboard/campaigns/${result.id}`);
  }
  return result;
}
