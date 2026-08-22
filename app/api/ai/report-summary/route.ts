import { NextResponse, after } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { summarizeCampaignReport, type ReportSummaryInput } from "@/lib/ai/report-summary";

/**
 * 캠페인 완료 시 AI 요약 자동 생성 (DB 트리거 → pg_net → 이 라우트).
 * - BUSINESS/ENTERPRISE 광고주에 한해 1회 (이미 요약이 있으면 건너뜀)
 * - pg_net 타임아웃(5s) 안에 202 로 응답하고 실제 생성은 after() 로 이어서 수행
 * 사장님 결정(2026-08-22): "AI 요약은 캠페인 완료 시 BUSINESS에 한해 자동 1회 생성"
 */
export const maxDuration = 60;

export async function POST(req: Request) {
  const secret = process.env.NOTIFICATION_WEBHOOK_SECRET;
  if (!secret || req.headers.get("x-webhook-secret") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as { campaign_id?: string } | null;
  const campaignId = body?.campaign_id;
  if (!campaignId || !/^[0-9a-f-]{36}$/.test(campaignId)) {
    return NextResponse.json({ error: "campaign_id required" }, { status: 400 });
  }

  after(async () => {
    try {
      await generateForCompletedCampaign(campaignId);
    } catch (e) {
      console.error("[ai/report-summary] failed", campaignId, e instanceof Error ? e.message : e);
    }
  });
  return NextResponse.json({ accepted: true }, { status: 202 });
}

async function generateForCompletedCampaign(campaignId: string) {
  const admin = getAdminSupabase();
  const { data: camp } = await admin
    .from("campaigns")
    .select("id, advertiser_id, status, report_summary")
    .eq("id", campaignId)
    .maybeSingle();
  if (!camp || camp.status !== "completed" || camp.report_summary) return;

  // BUSINESS 이상만 (쿠키 없는 컨텍스트라 entitlements 를 직접 조회)
  const { data: sub } = await admin
    .from("subscriptions")
    .select("status, expires_at, plans(tier)")
    .eq("advertiser_id", camp.advertiser_id)
    .maybeSingle();
  const tier = (sub?.plans as { tier: string } | null)?.tier;
  const active = sub?.status === "active" && (!sub.expires_at || new Date(sub.expires_at).getTime() > Date.now());
  if (!active || !(tier === "business" || tier === "enterprise")) return;

  const { data: reportJson } = await admin.rpc("build_campaign_report", { p_campaign_id: campaignId });
  const report = reportJson as null | { campaign: Record<string, unknown>; channels: string[]; metrics: ReportSummaryInput["metrics"]; contents: ReportSummaryInput["contents"] };
  if (!report) return;
  const c = report.campaign;

  const result = await summarizeCampaignReport(
    {
      title: String(c.title ?? ""),
      businessName: String(c.business_name ?? ""),
      companyName: String(c.company_name ?? ""),
      advertiserKind: c.advertiser_kind === "agency" ? "agency" : "brand",
      status: "completed",
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
    },
    { userId: camp.advertiser_id, campaignId }
  );
  if (!result.ok) return;

  // 그 사이 소유자가 수동 생성했으면 덮어쓰지 않음
  await admin
    .from("campaigns")
    .update({ report_summary: JSON.parse(JSON.stringify(result.result)), report_summary_at: new Date().toISOString() })
    .eq("id", campaignId)
    .is("report_summary", null);
}
