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

/**
 * 광고주: 캠페인 취소 (검수 대기·모집 중·마감 상태에서만). 삭제 대신 취소로 이력을 보존한다.
 * 응모자 알림은 DB 트리거(notify_on_campaign_status)가 처리.
 */
export async function cancelCampaign(
  campaignId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data: camp } = await supabase
    .from("campaigns")
    .select("id, status, advertiser_id")
    .eq("id", campaignId)
    .maybeSingle();
  if (!camp || camp.advertiser_id !== user.id) return { ok: false, error: "캠페인을 찾을 수 없습니다." };
  if (!["pending_approval", "open", "closed", "rejected"].includes(camp.status)) {
    return { ok: false, error: "현재 상태에서는 취소할 수 없습니다." };
  }
  // 이미 완료(포인트 지급) 응모가 있으면 취소 대신 종료 처리로 유도
  const { count: completed } = await supabase
    .from("applications")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaignId)
    .eq("status", "completed");
  if ((completed ?? 0) > 0) {
    return { ok: false, error: "이미 콘텐츠 승인·포인트 지급이 완료된 응모가 있어 취소할 수 없습니다. 모집 마감 상태로 두세요." };
  }

  const { error } = await supabase
    .from("campaigns")
    .update({ status: "cancelled" })
    .eq("id", campaignId)
    .eq("advertiser_id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  revalidatePath("/dashboard/campaigns");
  return { ok: true };
}

/**
 * 모집중(open) 캠페인 조정: 모집 마감 연장·인원 증원만 허용.
 * 그 외 변경은 DB 트리거(trg_protect_campaign_updates)가 이중으로 차단한다.
 */
export async function adjustOpenCampaign(
  campaignId: string,
  input: { recruitEnd?: string; recruitCount?: number }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data: camp } = await supabase
    .from("campaigns")
    .select("id, status, advertiser_id, recruit_end, recruit_count, always_open")
    .eq("id", campaignId)
    .maybeSingle();
  if (!camp || camp.advertiser_id !== user.id) return { ok: false, error: "캠페인을 찾을 수 없습니다." };
  if (camp.status !== "open") return { ok: false, error: "모집중인 캠페인만 조정할 수 있습니다." };

  const patch: { recruit_end?: string; recruit_count?: number } = {};

  if (input.recruitEnd) {
    // datetime-local 값은 빌더와 동일하게 UTC 로 해석한다
    const next = new Date(input.recruitEnd.length === 16 ? `${input.recruitEnd}:00Z` : input.recruitEnd);
    if (Number.isNaN(next.getTime())) return { ok: false, error: "마감 일시가 올바르지 않습니다." };
    if (next.getTime() < new Date(camp.recruit_end).getTime()) {
      return { ok: false, error: "모집 마감은 연장만 할 수 있습니다." };
    }
    patch.recruit_end = next.toISOString();
  }

  if (typeof input.recruitCount === "number") {
    if (!Number.isInteger(input.recruitCount) || input.recruitCount < camp.recruit_count) {
      return { ok: false, error: "모집 인원은 현재보다 줄일 수 없습니다." };
    }
    if (input.recruitCount > 1000) return { ok: false, error: "모집 인원은 최대 1,000명입니다." };
    if (input.recruitCount !== camp.recruit_count) patch.recruit_count = input.recruitCount;
  }

  if (Object.keys(patch).length === 0) return { ok: false, error: "변경할 내용이 없습니다." };

  const { error } = await supabase.from("campaigns").update(patch).eq("id", campaignId);
  if (error) return { ok: false, error: "저장하지 못했습니다. 잠시 후 다시 시도해주세요." };

  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  revalidatePath("/dashboard/campaigns");
  return { ok: true };
}
