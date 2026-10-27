import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { asUuid } from "@/lib/query-params";
import { ReviewReportEditor } from "@/components/reports/ReviewReportEditor";
import { EMPTY_INPUT, loadCampaignOptions, prefillFromCampaign } from "../campaign-options";

export const metadata = { title: "결과 보고서 만들기" };

/**
 * 결과 보고서 만들기 — 리뷰 링크가 든 엑셀을 올리면 보고서 페이지(/r/<token>)가 생긴다.
 * 캠페인 진행 흐름과 무관하게 '강제로' 만드는 보고서. `?campaign=` 으로 들어오면 그 캠페인 정보를 채워 둔다.
 */
export default async function NewReviewReportPage({ searchParams }: { searchParams: Promise<{ campaign?: string }> }) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "advertiser" && profile.role !== "operator") redirect("/dashboard");

  const { campaign } = await searchParams;
  const cid = asUuid(campaign);
  const supabase = await createClient();
  const campaigns = await loadCampaignOptions(supabase, profile, cid);
  const linked = cid ? campaigns.find((c) => c.id === cid) : undefined;
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://luby.im").replace(/\/$/, "");

  return (
    <div>
      <Link href="/dashboard/reports" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> 결과 보고서
      </Link>
      <h1 className="display mt-3 text-3xl font-semibold lg:text-4xl">결과 보고서 만들기</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        리뷰 링크가 든 엑셀(.xlsx·CSV)을 올리면 공유 링크로 열리는 보고서 페이지가 바로 만들어집니다. 응모·선정·제출 흐름과 상관없이 엑셀이 곧 결과입니다.
      </p>
      <ReviewReportEditor
        mode="create"
        siteUrl={siteUrl}
        campaigns={campaigns}
        initial={linked ? prefillFromCampaign(linked) : EMPTY_INPUT}
      />
    </div>
  );
}
