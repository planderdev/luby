"use server";

import { createClient } from "@/lib/supabase/server";
import { getEntitlements } from "@/lib/plans/entitlements";

type Result = { ok: true } | { ok: false; error: string };

/** 광고주 → 크리에이터 캠페인 초대 (BUSINESS 이상, 본인 모집중 캠페인만) */
export async function inviteCreator(
  campaignId: string,
  influencerId: string,
  message: string
): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const ent = await getEntitlements(user.id);
  if (!ent.aiMatching) {
    return { ok: false, error: "크리에이터 초대는 BUSINESS 플랜부터 이용할 수 있어요." };
  }

  const text = message.trim().slice(0, 500);
  const { error } = await supabase.from("campaign_invitations").insert({
    campaign_id: campaignId,
    influencer_id: influencerId,
    invited_by: user.id,
    message: text || null,
  });
  if (error) {
    if (error.code === "23505") return { ok: false, error: "이미 초대한 크리에이터예요." };
    return {
      ok: false,
      error: "초대를 보낼 수 없어요. 모집중인 본인 캠페인인지 확인해주세요.",
    };
  }
  return { ok: true };
}

/** 크리에이터 → 초대 수락/거절 (수락 시 응모 자동 생성) */
export async function respondInvitation(invitationId: string, accept: boolean): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { error } = await supabase.rpc("respond_campaign_invitation", {
    p_invitation_id: invitationId,
    p_accept: accept,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
