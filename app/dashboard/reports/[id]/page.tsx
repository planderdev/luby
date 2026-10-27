import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { asUuid } from "@/lib/query-params";
import { ReviewReportEditor, type ExistingRow } from "@/components/reports/ReviewReportEditor";
import { loadCampaignOptions } from "../campaign-options";

export const metadata = { title: "결과 보고서 편집" };

/** 결과 보고서 편집 — 공유 링크·공개 여부·내용·리뷰 링크 행 교체·삭제 */
export default async function EditReviewReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "advertiser" && profile.role !== "operator") redirect("/dashboard");

  const { id: raw } = await params;
  const id = asUuid(raw);
  if (!id) notFound();
  const { created } = await searchParams;
  const supabase = await createClient();
  const [{ data: report }, { data: rows }] = await Promise.all([
    supabase
      .from("review_reports")
      .select("id, token, campaign_id, title, business_name, period_start, period_end, recruit_count, memo, is_public, created_at, updated_at")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("review_report_rows")
      .select("id, seq, channel, creator_name, creator_url, post_url, posted_at, followers, likes, comments, views, note")
      .eq("report_id", id)
      .order("seq"),
  ]);
  if (!report) notFound();
  const campaigns = await loadCampaignOptions(supabase, profile, report.campaign_id);
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://luby.im").replace(/\/$/, "");

  return (
    <div>
      <Link href="/dashboard/reports" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> 결과 보고서
      </Link>
      <h1 className="display mt-3 break-keep text-3xl font-semibold lg:text-4xl">{report.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {report.business_name ? `${report.business_name} · ` : ""}리뷰 {rows?.length ?? 0}건 · {new Date(report.updated_at).toLocaleDateString("ko-KR")} 갱신
      </p>
      <ReviewReportEditor
        mode="edit"
        reportId={report.id}
        token={report.token}
        isPublic={report.is_public}
        justCreated={created === "1"}
        siteUrl={siteUrl}
        campaigns={campaigns}
        initial={{
          title: report.title,
          business_name: report.business_name,
          campaign_id: report.campaign_id,
          period_start: report.period_start,
          period_end: report.period_end,
          recruit_count: report.recruit_count,
          memo: report.memo,
        }}
        existingRows={(rows ?? []) as ExistingRow[]}
      />
    </div>
  );
}
