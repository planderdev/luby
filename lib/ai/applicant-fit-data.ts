import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { scoreApplicants, type FitApplicant, type ApplicantFit } from "./applicant-fit";

const MAX_BATCH = 30;

type Client = SupabaseClient<Database>;

/**
 * 캠페인의 대기 응모자 데이터를 모아 AI 적합도를 평가한다 (DB 쓰기 없음).
 * 액션(광고주 세션)과 스모크 스크립트(service_role) 양쪽에서 재사용.
 */
export async function evaluatePendingApplicants(
  supabase: Client,
  camp: { id: string; title: string; business_name: string; industry_brief: string | null; category_id: string | null; region_id: string | null; promotion_type_id: string | null; point_amount: number; recruit_count: number },
  force = false
): Promise<{ ok: true; results: Map<string, ApplicantFit>; candidates: number } | { ok: false; error: string }> {
  const campaignId = camp.id;
  let q = supabase
    .from("applications")
    .select("id, influencer_id, message, ai_fit")
    .eq("campaign_id", campaignId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (!force) q = q.is("ai_fit", null);
  const { data: apps } = await q.limit(MAX_BATCH);
  if (!apps || apps.length === 0) return { ok: true, results: new Map(), candidates: 0 };

  const infIds = [...new Set(apps.map((a) => a.influencer_id))];
  const [category, region, promotion, missions, keywords, campChannels, profiles, influencers, channels, infCats, completed] = await Promise.all([
    camp.category_id ? supabase.from("categories").select("name").eq("id", camp.category_id).maybeSingle() : Promise.resolve({ data: null }),
    camp.region_id ? supabase.from("regions").select("name").eq("id", camp.region_id).maybeSingle() : Promise.resolve({ data: null }),
    camp.promotion_type_id ? supabase.from("promotion_types").select("name").eq("id", camp.promotion_type_id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("campaign_missions").select("channel_type_id, description").eq("campaign_id", campaignId),
    supabase.from("campaign_keywords").select("keyword").eq("campaign_id", campaignId),
    supabase.from("campaign_channels").select("channel_type_id").eq("campaign_id", campaignId),
    supabase.from("profiles").select("id, name").in("id", infIds),
    supabase.from("influencers").select("profile_id, region_id, bio").in("profile_id", infIds),
    supabase.from("influencer_channels").select("influencer_id, channel_type_id, handle, followers").in("influencer_id", infIds),
    supabase.from("influencer_categories").select("influencer_id, category_id").in("influencer_id", infIds),
    supabase.from("applications").select("influencer_id").in("influencer_id", infIds).eq("status", "completed"),
  ]);

  const [{ data: channelTypes }, { data: cats }, { data: regions }] = await Promise.all([
    supabase.from("channel_types").select("id, name"),
    supabase.from("categories").select("id, name"),
    supabase.from("regions").select("id, name"),
  ]);
  const chName = new Map((channelTypes ?? []).map((c) => [c.id, c.name]));
  const catName = new Map((cats ?? []).map((c) => [c.id, c.name]));
  const regName = new Map((regions ?? []).map((r) => [r.id, r.name]));
  const profileName = new Map((profiles.data ?? []).map((p) => [p.id, p.name ?? "크리에이터"]));
  const infById = new Map((influencers.data ?? []).map((i) => [i.profile_id, i]));
  const completedCount = new Map<string, number>();
  for (const c of completed.data ?? []) completedCount.set(c.influencer_id, (completedCount.get(c.influencer_id) ?? 0) + 1);

  const applicants: FitApplicant[] = apps.map((a) => {
    const inf = infById.get(a.influencer_id);
    return {
      id: a.id,
      name: profileName.get(a.influencer_id) ?? "크리에이터",
      region: inf?.region_id ? (regName.get(inf.region_id) ?? null) : null,
      categories: (infCats.data ?? []).filter((x) => x.influencer_id === a.influencer_id).map((x) => catName.get(x.category_id) ?? "").filter(Boolean),
      bio: inf?.bio ?? null,
      channels: (channels.data ?? [])
        .filter((c) => c.influencer_id === a.influencer_id)
        .map((c) => ({ channel: chName.get(c.channel_type_id) ?? "채널", handle: c.handle, followers: c.followers })),
      completedCampaigns: completedCount.get(a.influencer_id) ?? 0,
      message: a.message,
    };
  });

  const result = await scoreApplicants(
    {
      title: camp.title,
      businessName: camp.business_name,
      industryBrief: camp.industry_brief,
      category: category.data?.name ?? null,
      region: region.data?.name ?? null,
      promotionType: promotion.data?.name ?? null,
      channels: (campChannels.data ?? []).map((c) => chName.get(c.channel_type_id) ?? "").filter(Boolean),
      missions: (missions.data ?? []).map((m) => ({ channel: chName.get(m.channel_type_id) ?? "채널", description: m.description })),
      keywords: (keywords.data ?? []).map((k) => k.keyword),
      pointAmount: camp.point_amount,
      recruitCount: camp.recruit_count,
    },
    applicants
  );
  if (!result.ok) return result;
  return { ok: true, results: result.results, candidates: apps.length };
}
