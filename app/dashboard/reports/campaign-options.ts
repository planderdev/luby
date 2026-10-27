import type { createClient } from "@/lib/supabase/server";
import type { ReviewReportInput } from "./actions";

/** 보고서 편집기의 '캠페인 연결' 선택지 — 광고주는 내 캠페인, 운영자는 전체(최근 200) */
export type CampaignOption = {
  id: string;
  title: string;
  business_name: string;
  status: string;
  recruit_count: number;
  recruit_start: string;
  recruit_end: string;
  experience_start: string | null;
  experience_end: string | null;
};

const COLS = "id, title, business_name, status, recruit_count, recruit_start, recruit_end, experience_start, experience_end";

export async function loadCampaignOptions(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profile: { id: string; role: string },
  ensureId: string | null
): Promise<CampaignOption[]> {
  let q = supabase.from("campaigns").select(COLS).order("updated_at", { ascending: false }).limit(200);
  if (profile.role !== "operator") q = q.eq("advertiser_id", profile.id);
  const { data } = await q;
  const list = (data ?? []) as CampaignOption[];
  if (ensureId && !list.some((c) => c.id === ensureId)) {
    const { data: one } = await supabase.from("campaigns").select(COLS).eq("id", ensureId).maybeSingle();
    if (one) list.unshift(one as CampaignOption);
  }
  return list;
}

/** 캠페인에서 보고서 기본값 채우기 — 체험 기간이 있으면 그것, 없으면 모집 기간 */
export function prefillFromCampaign(c: CampaignOption): ReviewReportInput {
  const d = (iso: string | null) => (iso ? iso.slice(0, 10) : null);
  return {
    title: c.title,
    business_name: c.business_name,
    campaign_id: c.id,
    period_start: d(c.experience_start) ?? d(c.recruit_start),
    period_end: d(c.experience_end) ?? d(c.recruit_end),
    recruit_count: c.recruit_count,
    memo: null,
  };
}

export const EMPTY_INPUT: ReviewReportInput = {
  title: "",
  business_name: "",
  campaign_id: null,
  period_start: null,
  period_end: null,
  recruit_count: null,
  memo: null,
};
