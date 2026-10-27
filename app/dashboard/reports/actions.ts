"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { dbErrorWith } from "@/lib/db-errors";
import { asUuid } from "@/lib/query-params";
import type { ReviewImportRow } from "@/lib/review-report-import";

/**
 * 결과 보고서 — 리뷰 링크 엑셀로 '강제' 생성하는 보고서의 서버 액션.
 * 광고주(본인 소유)·운영자만. RLS 가 같은 기준을 DB 층에서 한 번 더 지킨다.
 * 미리보기(파싱) → 생성/행 교체 → 공유 링크 /r/<token>.
 */
export type ReviewReportInput = {
  title: string;
  business_name: string;
  campaign_id: string | null;
  period_start: string | null;
  period_end: string | null;
  recruit_count: number | null;
  memo: string | null;
};

const MAX_ROWS = 500;

type Guard =
  | { ok: true; supabase: Awaited<ReturnType<typeof createClient>>; userId: string; role: "advertiser" | "operator" }
  | { ok: false; error: string };

async function guard(): Promise<Guard> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (me?.role !== "advertiser" && me?.role !== "operator") return { ok: false, error: "광고주·운영자만 결과 보고서를 만들 수 있습니다." };
  return { ok: true, supabase, userId: user.id, role: me.role };
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
function cleanInput(raw: ReviewReportInput): { ok: true; value: ReviewReportInput } | { ok: false; error: string } {
  const title = (raw.title ?? "").trim();
  if (!title) return { ok: false, error: "보고서 제목을 입력해주세요." };
  if (title.length > 120) return { ok: false, error: "제목은 120자 이내로 입력해주세요." };
  const business_name = (raw.business_name ?? "").trim().slice(0, 120);
  const campaign_id = raw.campaign_id ? asUuid(raw.campaign_id) : null;
  if (raw.campaign_id && !campaign_id) return { ok: false, error: "연결할 캠페인이 올바르지 않습니다." };
  const period_start = raw.period_start && DATE.test(raw.period_start) ? raw.period_start : null;
  const period_end = raw.period_end && DATE.test(raw.period_end) ? raw.period_end : null;
  if (period_start && period_end && period_start > period_end) return { ok: false, error: "기간의 시작일이 종료일보다 늦습니다." };
  let recruit_count: number | null = null;
  if (raw.recruit_count != null && raw.recruit_count !== ("" as unknown)) {
    const n = Number(raw.recruit_count);
    if (!Number.isInteger(n) || n < 0 || n > 100000) return { ok: false, error: "모집 인원은 0 이상의 정수로 입력해주세요." };
    recruit_count = n;
  }
  const memo = (raw.memo ?? "").trim().slice(0, 1000) || null;
  return { ok: true, value: { title, business_name, campaign_id, period_start, period_end, recruit_count, memo } };
}

type RowPayload = {
  seq: number;
  channel: string;
  creator_name: string | null;
  creator_url: string | null;
  post_url: string;
  posted_at: string | null;
  followers: number | null;
  likes: number | null;
  comments: number | null;
  views: number | null;
  note: string | null;
};
const clampCount = (n: number | null | undefined) => (n == null || !Number.isFinite(n) ? null : Math.max(0, Math.min(2_000_000_000, Math.round(n))));
const clip = (s: string | null | undefined, max: number) => {
  const v = (s ?? "").trim();
  return v ? v.slice(0, max) : null;
};
function cleanRows(rows: ReviewImportRow[]): { ok: true; rows: RowPayload[] } | { ok: false; error: string } {
  if (!Array.isArray(rows)) return { ok: false, error: "행 데이터가 없습니다." };
  const valid = rows.filter((r) => r && (!r.errors || r.errors.length === 0) && typeof r.post_url === "string" && /^https?:\/\//i.test(r.post_url));
  if (valid.length === 0) return { ok: false, error: "등록할 수 있는 리뷰 링크가 없습니다." };
  if (valid.length > MAX_ROWS) return { ok: false, error: `한 번에 ${MAX_ROWS}행까지 등록할 수 있습니다.` };
  const seqs = valid.map((r) => r.seq);
  const keepSeq = seqs.every((s) => Number.isInteger(s) && s > 0) && new Set(seqs).size === seqs.length;
  return {
    ok: true,
    rows: valid.map((r, i) => ({
      seq: keepSeq ? r.seq : i + 1,
      channel: (clip(String(r.channel ?? ""), 40) ?? "other").toLowerCase(),
      creator_name: clip(r.creator_name, 120),
      creator_url: r.creator_url && /^https?:\/\//i.test(r.creator_url) ? r.creator_url.slice(0, 2000) : null,
      post_url: r.post_url!.slice(0, 2000),
      posted_at: r.posted_at && DATE.test(r.posted_at) ? r.posted_at : null,
      followers: clampCount(r.followers),
      likes: clampCount(r.likes),
      comments: clampCount(r.comments),
      views: clampCount(r.views),
      note: clip(r.note, 500),
    })),
  };
}

async function ensureCampaignAccess(g: Extract<Guard, { ok: true }>, campaignId: string | null) {
  if (!campaignId) return null;
  const { data: camp } = await g.supabase.from("campaigns").select("id, advertiser_id").eq("id", campaignId).maybeSingle();
  if (!camp) return "연결할 캠페인을 찾을 수 없습니다.";
  if (g.role !== "operator" && camp.advertiser_id !== g.userId) return "내 캠페인만 연결할 수 있습니다.";
  return null;
}

export async function previewReviewReport(formData: FormData, sheet?: string) {
  const g = await guard();
  if (!g.ok) return { ok: false as const, error: g.error };
  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false as const, error: "파일을 선택하세요." };
  if (file.size > 3 * 1024 * 1024) return { ok: false as const, error: "파일은 3MB 이하여야 합니다." };
  const { parseReviewReportFile } = await import("@/lib/review-report-import");
  let parsed;
  try {
    parsed = parseReviewReportFile(await file.arrayBuffer(), sheet);
  } catch {
    return { ok: false as const, error: "파일을 읽지 못했습니다. 엑셀(.xlsx)·CSV 파일인지 확인해주세요." };
  }
  if (parsed.error) return { ok: false as const, error: parsed.error, sheets: parsed.sheets, sheet: parsed.sheet };
  if (parsed.rows.length > MAX_ROWS) return { ok: false as const, error: `한 번에 ${MAX_ROWS}행까지 등록할 수 있습니다. (${parsed.rows.length}행)`, sheets: parsed.sheets, sheet: parsed.sheet };
  return { ok: true as const, sheets: parsed.sheets, sheet: parsed.sheet, mode: parsed.mode, rows: parsed.rows };
}

export async function createReviewReport(input: ReviewReportInput, rows: ReviewImportRow[]) {
  const g = await guard();
  if (!g.ok) return { ok: false as const, error: g.error };
  const ci = cleanInput(input);
  if (!ci.ok) return { ok: false as const, error: ci.error };
  const cr = cleanRows(rows);
  if (!cr.ok) return { ok: false as const, error: cr.error };
  const campErr = await ensureCampaignAccess(g, ci.value.campaign_id);
  if (campErr) return { ok: false as const, error: campErr };

  const { data: report, error } = await g.supabase
    .from("review_reports")
    .insert({ ...ci.value, owner_id: g.userId })
    .select("id, token")
    .single();
  if (error || !report) return { ok: false as const, error: dbErrorWith("보고서를 만들지 못했습니다", error) };
  const { error: rowErr } = await g.supabase.from("review_report_rows").insert(cr.rows.map((r) => ({ ...r, report_id: report.id })));
  if (rowErr) {
    await g.supabase.from("review_reports").delete().eq("id", report.id); // 수동 롤백
    return { ok: false as const, error: dbErrorWith("리뷰 링크를 저장하지 못했습니다", rowErr) };
  }
  revalidatePath("/dashboard/reports");
  if (ci.value.campaign_id) revalidatePath(`/dashboard/campaigns/${ci.value.campaign_id}`);
  return { ok: true as const, id: report.id, token: report.token, count: cr.rows.length };
}

export async function updateReviewReport(id: string, input: ReviewReportInput) {
  const g = await guard();
  if (!g.ok) return { ok: false as const, error: g.error };
  const rid = asUuid(id);
  if (!rid) return { ok: false as const, error: "보고서를 찾을 수 없습니다." };
  const ci = cleanInput(input);
  if (!ci.ok) return { ok: false as const, error: ci.error };
  const campErr = await ensureCampaignAccess(g, ci.value.campaign_id);
  if (campErr) return { ok: false as const, error: campErr };
  const { data, error } = await g.supabase.from("review_reports").update(ci.value).eq("id", rid).select("id").maybeSingle();
  if (error) return { ok: false as const, error: dbErrorWith("저장하지 못했습니다", error) };
  if (!data) return { ok: false as const, error: "보고서를 찾을 수 없거나 권한이 없습니다." };
  revalidatePath("/dashboard/reports");
  revalidatePath(`/dashboard/reports/${rid}`);
  return { ok: true as const };
}

export async function replaceReviewReportRows(id: string, rows: ReviewImportRow[]) {
  const g = await guard();
  if (!g.ok) return { ok: false as const, error: g.error };
  const rid = asUuid(id);
  if (!rid) return { ok: false as const, error: "보고서를 찾을 수 없습니다." };
  const cr = cleanRows(rows);
  if (!cr.ok) return { ok: false as const, error: cr.error };
  const { data: own } = await g.supabase.from("review_reports").select("id").eq("id", rid).maybeSingle();
  if (!own) return { ok: false as const, error: "보고서를 찾을 수 없거나 권한이 없습니다." };
  // 기존 행을 백업해 두고 교체 — 새 행 저장이 실패하면 되돌린다
  const { data: backup } = await g.supabase
    .from("review_report_rows")
    .select("seq, channel, creator_name, creator_url, post_url, posted_at, followers, likes, comments, views, note")
    .eq("report_id", rid);
  const { error: delErr } = await g.supabase.from("review_report_rows").delete().eq("report_id", rid);
  if (delErr) return { ok: false as const, error: dbErrorWith("기존 행을 지우지 못했습니다", delErr) };
  const { error } = await g.supabase.from("review_report_rows").insert(cr.rows.map((r) => ({ ...r, report_id: rid })));
  if (error) {
    if (backup?.length) await g.supabase.from("review_report_rows").insert(backup.map((r) => ({ ...r, report_id: rid })));
    return { ok: false as const, error: dbErrorWith("리뷰 링크를 저장하지 못했습니다", error) };
  }
  await g.supabase.from("review_reports").update({ updated_at: new Date().toISOString() }).eq("id", rid);
  revalidatePath("/dashboard/reports");
  revalidatePath(`/dashboard/reports/${rid}`);
  return { ok: true as const, count: cr.rows.length };
}

export async function deleteReviewReportRow(id: string, rowId: string) {
  const g = await guard();
  if (!g.ok) return { ok: false as const, error: g.error };
  const rid = asUuid(id);
  const xid = asUuid(rowId);
  if (!rid || !xid) return { ok: false as const, error: "행을 찾을 수 없습니다." };
  const { error } = await g.supabase.from("review_report_rows").delete().eq("id", xid).eq("report_id", rid);
  if (error) return { ok: false as const, error: dbErrorWith("삭제하지 못했습니다", error) };
  revalidatePath(`/dashboard/reports/${rid}`);
  return { ok: true as const };
}

export async function setReviewReportPublic(id: string, on: boolean) {
  const g = await guard();
  if (!g.ok) return { ok: false as const, error: g.error };
  const rid = asUuid(id);
  if (!rid) return { ok: false as const, error: "보고서를 찾을 수 없습니다." };
  const { data, error } = await g.supabase.from("review_reports").update({ is_public: on }).eq("id", rid).select("id").maybeSingle();
  if (error) return { ok: false as const, error: dbErrorWith("변경하지 못했습니다", error) };
  if (!data) return { ok: false as const, error: "보고서를 찾을 수 없거나 권한이 없습니다." };
  revalidatePath("/dashboard/reports");
  revalidatePath(`/dashboard/reports/${rid}`);
  return { ok: true as const };
}

export async function deleteReviewReport(id: string) {
  const g = await guard();
  if (!g.ok) return { ok: false as const, error: g.error };
  const rid = asUuid(id);
  if (!rid) return { ok: false as const, error: "보고서를 찾을 수 없습니다." };
  const { data, error } = await g.supabase.from("review_reports").delete().eq("id", rid).select("id, campaign_id").maybeSingle();
  if (error) return { ok: false as const, error: dbErrorWith("삭제하지 못했습니다", error) };
  if (!data) return { ok: false as const, error: "보고서를 찾을 수 없거나 권한이 없습니다." };
  revalidatePath("/dashboard/reports");
  if (data.campaign_id) revalidatePath(`/dashboard/campaigns/${data.campaign_id}`);
  return { ok: true as const };
}
