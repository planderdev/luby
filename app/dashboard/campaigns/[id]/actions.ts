"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function applyToCampaign(
  campaignId: string,
  message: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { error } = await supabase.from("applications").insert({
    campaign_id: campaignId,
    influencer_id: user.id,
    message: message.trim() || null,
    status: "pending",
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "이미 응모하셨습니다." };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  return { ok: true };
}

export async function cancelApplication(
  campaignId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { error } = await supabase
    .from("applications")
    .update({ status: "cancelled" })
    .eq("campaign_id", campaignId)
    .eq("influencer_id", user.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  return { ok: true };
}

export async function selectApplicant(
  campaignId: string,
  applicationId: string,
  decision: "selected" | "rejected"
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { error } = await supabase
    .from("applications")
    .update({
      status: decision,
      selected_at: new Date().toISOString(),
      selected_by: user.id,
    })
    .eq("id", applicationId)
    .eq("campaign_id", campaignId);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  return { ok: true };
}

// 검수 승인·수정 요청은 SECURITY DEFINER 함수가 캠페인 소유권을 DB에서 재검증한다.
// 승인은 제출 approved + 응모 completed + 포인트 지급이 한 트랜잭션으로 처리된다.
export async function approveSubmission(
  campaignId: string,
  submissionId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { error } = await supabase.rpc("approve_submission", {
    p_submission_id: submissionId,
  });

  if (error) return { ok: false, error: "승인에 실패했습니다. 이미 처리되었는지 확인해주세요." };

  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  revalidatePath("/dashboard/applications");
  return { ok: true };
}

export async function requestSubmissionRevision(
  campaignId: string,
  submissionId: string,
  feedback: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const trimmed = feedback.trim();
  if (!trimmed) return { ok: false, error: "수정 요청 사유를 입력해주세요." };

  const { error } = await supabase.rpc("request_submission_revision", {
    p_submission_id: submissionId,
    p_feedback: trimmed.slice(0, 1000),
  });

  if (error) return { ok: false, error: "수정 요청에 실패했습니다. 이미 처리되었는지 확인해주세요." };

  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  revalidatePath("/dashboard/applications");
  return { ok: true };
}
