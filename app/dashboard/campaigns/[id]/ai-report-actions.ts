"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { getEntitlements } from "@/lib/plans/entitlements";
import { summarizeCampaignReport, type ReportSummary, type ReportSummaryInput } from "@/lib/ai/report-summary";

type Result = { ok: true; summary: ReportSummary; generatedAt: string } | { ok: false; error: string };

/**
 * 성과 리포트 AI 요약 생성/갱신 — 소유 광고주·대행사, BUSINESS 이상.
 * 집계는 build_campaign_report(service_role 전용)로 받아 공개 리포트와 동일한 숫자를 쓴다.
 * 결과는 campaigns.report_summary 에 캐시되어 /r/<token> 과 대시보드에 표시된다.
 */
export async function generateReportSummary(campaignId: string): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data: camp } = await supabase
    .from("campaigns")
    .select("id, advertiser_id, status")
    .eq("id", campaignId)
    .maybeSingle();
  if (!camp || camp.advertiser_id !== user.id) return { ok: false, error: "캠페인을 찾을 수 없습니다." };
  if (!["open", "closed", "completed"].includes(camp.status)) {
    return { ok: false, error: "모집중 이후 상태의 캠페인만 요약할 수 있습니다." };
  }

  const ent = await getEntitlements(user.id);
  if (!ent.aiMatching) {
    return { ok: false, error: "AI 리포트 요약은 BUSINESS 플랜부터 이용할 수 있어요." };
  }

  const admin = getAdminSupabase();
  const { data: reportJson } = await admin.rpc("build_campaign_report", { p_campaign_id: campaignId });
  const report = reportJson as null | {
    campaign: Record<string, unknown>;
    channels: string[];
    metrics: ReportSummaryInput["metrics"];
    contents: ReportSummaryInput["contents"];
  };
  if (!report) return { ok: false, error: "리포트 데이터를 불러오지 못했습니다." };
  const c = report.campaign;

  const result = await summarizeCampaignReport({
    title: String(c.title ?? ""),
    businessName: String(c.business_name ?? ""),
    companyName: String(c.company_name ?? ""),
    advertiserKind: c.advertiser_kind === "agency" ? "agency" : "brand",
    status: camp.status as "open" | "closed" | "completed",
    category: (c.category as string | null) ?? null,
    promotion: (c.promotion as string | null) ?? null,
    industryBrief: (c.industry_brief as string | null) ?? null,
    channels: report.channels ?? [],
    recruitCount: Number(c.recruit_count ?? 0),
    pointAmount: Number(c.point_amount ?? 0),
    recruitStart: String(c.recruit_start ?? ""),
    recruitEnd: String(c.recruit_end ?? ""),
    alwaysOpen: Boolean(c.always_open),
    metrics: report.metrics,
    contents: report.contents ?? [],
  }, { userId: user.id, campaignId });
  if (!result.ok) return result;

  const generatedAt = new Date().toISOString();
  const { error } = await admin
    .from("campaigns")
    .update({ report_summary: JSON.parse(JSON.stringify(result.result)), report_summary_at: generatedAt })
    .eq("id", campaignId);
  if (error) return { ok: false, error: "요약을 저장하지 못했습니다." };

  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  return { ok: true, summary: result.result, generatedAt };
}
