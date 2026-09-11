"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ExternalResultRow } from "@/lib/external-results-import";

/**
 * 외부 채널(샤오홍슈 등) 체험단 결과 등록 — 캠페인 소유 광고주 또는 운영자.
 * 엑셀 시트(순번·방문일자·계정링크·팔로워·업로드 링크·좋아요·내용)를 올리면
 * 미리보기 → 등록. 등록된 행은 캠페인 성과 카드와 /r/<token> 결과 보고서에 실린다.
 */
type Guard = { ok: true; supabase: Awaited<ReturnType<typeof createClient>>; userId: string } | { ok: false; error: string };

async function guardCampaign(campaignId: string): Promise<Guard> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  const [{ data: me }, { data: camp }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    supabase.from("campaigns").select("id, advertiser_id").eq("id", campaignId).maybeSingle(),
  ]);
  if (!camp) return { ok: false, error: "캠페인을 찾을 수 없습니다." };
  if (me?.role !== "operator" && camp.advertiser_id !== user.id) return { ok: false, error: "권한이 없습니다." };
  return { ok: true, supabase, userId: user.id };
}

export async function previewExternalResults(campaignId: string, formData: FormData, sheet?: string) {
  const g = await guardCampaign(campaignId);
  if (!g.ok) return { ok: false as const, error: g.error };
  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false as const, error: "파일을 선택하세요." };
  if (file.size > 2 * 1024 * 1024) return { ok: false as const, error: "파일은 2MB 이하여야 합니다." };
  const { parseExternalResultsFile } = await import("@/lib/external-results-import");
  const parsed = parseExternalResultsFile(await file.arrayBuffer(), sheet);
  if (parsed.headerError) return { ok: false as const, error: parsed.headerError, sheets: parsed.sheets, sheet: parsed.sheet };
  if (parsed.rows.length > 500) return { ok: false as const, error: "한 번에 500행까지 등록할 수 있습니다." };
  return { ok: true as const, sheets: parsed.sheets, sheet: parsed.sheet, rows: parsed.rows };
}

export async function commitExternalResults(campaignId: string, rows: ExternalResultRow[], replace: boolean, source = "xiaohongshu") {
  const g = await guardCampaign(campaignId);
  if (!g.ok) return { ok: false as const, error: g.error };
  const valid = rows.filter((r) => r.errors.length === 0 && r.creator_url);
  if (valid.length === 0) return { ok: false as const, error: "등록할 수 있는 행이 없습니다." };
  if (replace) {
    const { error } = await g.supabase.from("campaign_external_results").delete().eq("campaign_id", campaignId);
    if (error) return { ok: false as const, error: "기존 결과를 지우지 못했습니다." };
  }
  const payload = valid.map((r) => ({
    campaign_id: campaignId,
    seq: r.seq,
    source,
    visited_at: r.visited_at,
    creator_url: r.creator_url,
    followers: r.followers,
    post_url: r.post_url,
    likes: r.likes,
    note: r.note,
    updated_at: new Date().toISOString(),
  }));
  const { error } = await g.supabase.from("campaign_external_results").upsert(payload, { onConflict: "campaign_id,seq" });
  if (error) return { ok: false as const, error: "저장하지 못했습니다. 순번이 겹치는지 확인해주세요." };
  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  return { ok: true as const, count: valid.length };
}

export async function deleteExternalResult(campaignId: string, id: string) {
  const g = await guardCampaign(campaignId);
  if (!g.ok) return { ok: false as const, error: g.error };
  const { error } = await g.supabase.from("campaign_external_results").delete().eq("id", id).eq("campaign_id", campaignId);
  if (error) return { ok: false as const, error: "삭제하지 못했습니다." };
  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  return { ok: true as const };
}
