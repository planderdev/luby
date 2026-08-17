import { redirect } from "next/navigation";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { getEntitlements } from "@/lib/plans/entitlements";
import { fetchUICatalog } from "@/lib/cache/ui-catalog";
import { CampaignBuilder } from "./CampaignBuilder";
import type { CampaignDraft } from "./actions";

export const metadata = { title: "새 캠페인 — 루비AI" };

// AI 서버 액션(특히 "AI에게 전부 맡기기")은 생성에 수십 초가 걸릴 수 있다.
// Vercel 함수 기본 타임아웃(10s)에 잘리지 않도록 여유 확보.
export const maxDuration = 60;

export default async function NewCampaignPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
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

  // 복제: 내 캠페인 + 하위 항목을 읽어 프리필 (RLS로 소유 캠페인만 조회됨)
  let initial: Partial<CampaignDraft> | null = null;
  if (from && /^[0-9a-f-]{36}$/.test(from)) {
    const supabase = await createClient();
    const { data: src } = await supabase
      .from("campaigns")
      .select("id, advertiser_id, title, business_name, industry_brief, thumbnail_url, contact_phone, region_id, promotion_type_id, category_id, same_day_reservation, always_open, recruit_count, point_amount")
      .eq("id", from)
      .eq("advertiser_id", profile.id)
      .maybeSingle();
    if (src) {
      const [{ data: ch }, { data: ms }, { data: kw }, { data: of }, { data: sc }] = await Promise.all([
        supabase.from("campaign_channels").select("channel_type_id").eq("campaign_id", src.id),
        supabase.from("campaign_missions").select("channel_type_id, description").eq("campaign_id", src.id),
        supabase.from("campaign_keywords").select("keyword").eq("campaign_id", src.id),
        supabase.from("campaign_offerings").select("title, description, estimated_value").eq("campaign_id", src.id),
        supabase.from("campaign_schedules").select("day_of_week, start_time, end_time").eq("campaign_id", src.id),
      ]);
      initial = {
        title: src.title.endsWith(" (복제)") ? src.title : `${src.title} (복제)`,
        business_name: src.business_name,
        industry_brief: src.industry_brief ?? "",
        thumbnail_url: src.thumbnail_url ?? "",
        contact_phone: src.contact_phone ?? "",
        region_id: src.region_id,
        promotion_type_id: src.promotion_type_id,
        category_id: src.category_id,
        channel_type_ids: (ch ?? []).map((c) => c.channel_type_id),
        missions: (ms ?? []).map((m) => ({ channel_type_id: m.channel_type_id, description: m.description })),
        same_day_reservation: src.same_day_reservation,
        always_open: src.always_open,
        schedules: (sc ?? [])
          .filter((s) => s.day_of_week !== null)
          .map((s) => ({ day_of_week: s.day_of_week as number, start_time: s.start_time ?? "", end_time: s.end_time ?? "" })),
        recruit_count: src.recruit_count,
        keywords: (kw ?? []).map((k) => k.keyword),
        offerings: (of ?? []).map((o) => ({ title: o.title, description: o.description ?? "", estimated_value: o.estimated_value })),
        point_amount: src.point_amount,
      };
    }
  }

  return (
    <CampaignBuilder
      initial={initial}
      regions={catalog.regions}
      categories={catalog.categories}
      channels={catalog.channels}
      promotionTypes={catalog.promotionTypes}
    />
  );
}
