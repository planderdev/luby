import { redirect } from "next/navigation";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { getEntitlements } from "@/lib/plans/entitlements";
import { fetchUICatalog } from "@/lib/cache/ui-catalog";
import { CampaignBuilder } from "./CampaignBuilder";

export const metadata = { title: "새 캠페인 — 루비AI" };

// AI 서버 액션(특히 "AI에게 전부 맡기기")은 생성에 수십 초가 걸릴 수 있다.
// Vercel 함수 기본 타임아웃(10s)에 잘리지 않도록 여유 확보.
export const maxDuration = 60;

export default async function NewCampaignPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login?redirect=/dashboard/campaigns/new");
  if (profile.role !== "advertiser") redirect("/dashboard");

  // 플랜 제한: FREE는 캠페인 1건 — 한도에 도달하면 빌더 대신 업그레이드 안내
  const ent = await getEntitlements(profile.id);
  if (ent.maxCampaigns !== null) {
    const supabase = await createClient();
    const { count } = await supabase
      .from("campaigns")
      .select("id", { count: "exact", head: true })
      .eq("advertiser_id", profile.id);
    if ((count ?? 0) >= ent.maxCampaigns) {
      return (
        <div className="mx-auto max-w-lg py-12 text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-3xl bg-accent-soft">
            <Sparkles className="size-8 text-accent-ink" />
          </div>
          <h1 className="display mt-6 text-3xl font-semibold">
            {ent.planName} 플랜 한도에 도달했어요
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {ent.planName} 플랜은 캠페인을 {ent.maxCampaigns}건까지 등록할 수 있습니다.
            <br />
            BUSINESS 플랜으로 업그레이드하면 캠페인 무제한 등록, AI 매칭 풀패키지,
            응모자 무제한 열람이 열립니다.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-2 sm:flex-row">
            <Link
              href="/dashboard/billing"
              className="inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background"
            >
              BUSINESS 업그레이드
            </Link>
            <Link
              href="/dashboard/campaigns"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-6 py-3 text-sm font-medium hover:bg-muted"
            >
              내 캠페인 보기
            </Link>
          </div>
        </div>
      );
    }
  }

  const catalog = await fetchUICatalog();

  return (
    <CampaignBuilder
      regions={catalog.regions}
      categories={catalog.categories}
      channels={catalog.channels}
      promotionTypes={catalog.promotionTypes}
    />
  );
}
