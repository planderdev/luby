import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { fetchUICatalog } from "@/lib/cache/ui-catalog";
import { Plus } from "lucide-react";
import { CampaignCard } from "@/components/dashboard/CampaignCard";
import { CampaignFilters } from "@/components/dashboard/CampaignFilters";
import {
  rankCampaigns,
  campaignBadges,
  hasPersonalSignal as hasSignal,
  type CreatorSignals,
} from "@/lib/campaign-ranking";

export const metadata = { title: "캠페인 — 루비AI" };

const STATUS_OPTIONS_ADVERTISER = [
  { value: "", label: "상태 전체" },
  { value: "draft", label: "초안" },
  { value: "pending_approval", label: "검수중" },
  { value: "open", label: "모집중" },
  { value: "closed", label: "마감" },
  { value: "completed", label: "완료" },
];

const SORT_OPTIONS = [
  { value: "", label: "최신순" },
  { value: "deadline", label: "마감 임박순" },
  { value: "points", label: "포인트 높은순" },
];
// 크리에이터: 내 분야·지역·응모 여부를 반영한 추천순이 기본
const SORT_OPTIONS_INFLUENCER = [
  { value: "", label: "추천순 (내 분야·지역)" },
  { value: "recent", label: "최신순" },
  { value: "deadline", label: "마감 임박순" },
  { value: "points", label: "포인트 높은순" },
];

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    q?: string;
    category?: string;
    region?: string;
    sort?: string;
  }>;
}) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login?redirect=/dashboard/campaigns");

  const params = await searchParams;
  const status = params.status ?? "";
  const q = params.q ?? "";
  const category = params.category ?? "";
  const region = params.region ?? "";
  const sort = params.sort ?? "";

  const supabase = await createClient();

  let query = supabase
    .from("campaigns")
    .select(
      "id, title, business_name, thumbnail_url, status, recruit_start, recruit_end, recruit_count, point_amount, region_id, category_id"
    );

  const isInfluencer = profile.role === "influencer";
  const personalize = isInfluencer && sort === ""; // 추천순 — DB 정렬 후 메모리 재랭킹

  if (sort === "deadline") {
    query = query.order("recruit_end", { ascending: true });
  } else if (sort === "points") {
    query = query.order("point_amount", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  if (profile.role === "advertiser") {
    query = query.eq("advertiser_id", profile.id);
    if (status) query = query.eq("status", status as "draft");
  } else if (profile.role === "influencer") {
    query = query.eq("status", "open");
  } else {
    // operator: see all
    if (status) query = query.eq("status", status as "draft");
  }

  if (category) query = query.eq("category_id", category);
  if (region) query = query.eq("region_id", region);
  if (q) {
    // .or() 필터 구문 구분자와 충돌하는 문자는 공백 처리
    const safe = q.replace(/[,()]/g, " ").trim();
    if (safe) query = query.or(`title.ilike.%${safe}%,business_name.ilike.%${safe}%`);
  }

  // Fetch the campaigns query and the cached catalog in parallel
  const [{ data: rawCampaigns }, catalog] = await Promise.all([query, fetchUICatalog()]);

  const regionsById = new Map(catalog.regions.map((r) => [r.id, r]));
  const categoriesById = new Map(catalog.categories.map((c) => [c.id, c]));

  // 크리에이터 맞춤 신호: 내 분야·지역·응모 여부 (lib/campaign-ranking과 공유)
  const signals: CreatorSignals = {
    categoryIds: new Set<string>(),
    regionId: null,
    appliedCampaignIds: new Set<string>(),
  };
  if (isInfluencer) {
    const [{ data: cats }, { data: inf }, { data: apps }] = await Promise.all([
      supabase.from("influencer_categories").select("category_id").eq("influencer_id", profile.id),
      supabase.from("influencers").select("region_id").eq("profile_id", profile.id).maybeSingle(),
      supabase.from("applications").select("campaign_id").eq("influencer_id", profile.id),
    ]);
    for (const c of cats ?? []) signals.categoryIds.add(c.category_id);
    signals.regionId = inf?.region_id ?? null;
    for (const a of apps ?? []) signals.appliedCampaignIds.add(a.campaign_id);
  }

  const campaigns = personalize ? rankCampaigns(rawCampaigns ?? [], signals) : rawCampaigns;
  const hasPersonalSignal = hasSignal(signals);

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {profile.role === "influencer" ? "캠페인 둘러보기" : "캠페인"}
          </p>
          <h1 className="display mt-2 text-3xl font-semibold lg:text-4xl">
            {profile.role === "advertiser" && "내 캠페인"}
            {profile.role === "influencer" && "지금 모집중인 캠페인"}
            {profile.role === "operator" && "전체 캠페인"}
          </h1>
        </div>

        {profile.role === "advertiser" && (
          <Link
            href="/dashboard/campaigns/new"
            className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background"
          >
            <Plus className="size-4" />새 캠페인
          </Link>
        )}
      </header>

      {/* Filters */}
      <CampaignFilters
        categories={catalog.categories.map((c) => ({
          value: c.id,
          label: `${c.emoji ?? ""} ${c.name}`.trim(),
        }))}
        regions={catalog.regions.map((r) => ({
          value: r.id,
          label: `${r.flag} ${r.name}`.trim(),
        }))}
        statusOptions={profile.role === "influencer" ? null : STATUS_OPTIONS_ADVERTISER}
        sortOptions={isInfluencer ? SORT_OPTIONS_INFLUENCER : SORT_OPTIONS}
      />

      <p className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span>총 {(campaigns ?? []).length}개 캠페인</span>
        {isInfluencer && personalize && !hasPersonalSignal && (
          <span>
            ·{" "}
            <Link href="/dashboard/settings" className="underline underline-offset-2 hover:text-foreground">
              설정에서 전문 분야·지역을 등록
            </Link>
            하면 내게 맞는 캠페인이 위로 올라와요
          </span>
        )}
      </p>

      {/* List */}
      <div className="mt-3 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(campaigns ?? []).map((c) => {
          const region = regionsById.get(c.region_id);
          const category = categoriesById.get(c.category_id);
          return (
            <CampaignCard
              key={c.id}
              id={c.id}
              title={c.title}
              businessName={c.business_name}
              status={c.status}
              thumbnail={c.thumbnail_url}
              recruitStart={c.recruit_start}
              recruitEnd={c.recruit_end}
              recruitCount={c.recruit_count}
              pointAmount={c.point_amount}
              badges={isInfluencer ? campaignBadges(c, signals) : []}
              regionFlag={region?.flag ?? ""}
              regionName={region?.name ?? ""}
              categoryEmoji={category?.emoji ?? ""}
              categoryName={category?.name ?? ""}
            />
          );
        })}
        {(!campaigns || campaigns.length === 0) && (
          <div className="col-span-full rounded-3xl border border-dashed border-border bg-background p-10 text-center">
            <p className="text-sm text-muted-foreground">
              {profile.role === "advertiser"
                ? "아직 만든 캠페인이 없어요. 새 캠페인을 만들어보세요."
                : "조건에 맞는 캠페인이 없습니다."}
            </p>
            {profile.role === "advertiser" && (
              <Link
                href="/dashboard/campaigns/new"
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background"
              >
                <Plus className="size-4" />새 캠페인 만들기
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
