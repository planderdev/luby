"use server";

import { createClient } from "@/lib/supabase/server";
import { draftApplyMessage } from "@/lib/ai/apply-message";

/**
 * 크리에이터 응모 메시지 AI 초안 — 캠페인 미션·키워드 + 내 프로필(소개·채널·분야) + 선정 가능성 맥락(경쟁률·채널·이력)으로
 * 2~3문장. 과장·거짓 금지, 실제 데이터에 없는 수치는 쓰지 않는다. 프롬프트·호출은 lib/ai/apply-message.ts.
 */
export async function suggestApplicationMessage(
  campaignId: string
): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const [{ data: profile }, { data: camp }] = await Promise.all([
    supabase.from("profiles").select("name, role, approved").eq("id", user.id).maybeSingle(),
    supabase
      .from("campaigns")
      .select("id, title, business_name, industry_brief, point_amount, status, category_id, region_id")
      .eq("id", campaignId)
      .maybeSingle(),
  ]);
  if (!profile || profile.role !== "influencer") return { ok: false, error: "크리에이터만 사용할 수 있어요." };
  if (!profile.approved) return { ok: false, error: "계정 승인 후 사용할 수 있어요." };
  if (!camp || camp.status !== "open") return { ok: false, error: "모집 중인 캠페인이 아닙니다." };

  const [{ data: inf }, { data: channels }, { data: cats }, { data: missions }, { data: keywords }, { data: catRow }, { data: fitRaw }] =
    await Promise.all([
      supabase.from("influencers").select("bio, region_id").eq("profile_id", user.id).maybeSingle(),
      supabase.from("influencer_channels").select("followers, handle, channel_types(name)").eq("influencer_id", user.id),
      supabase.from("influencer_categories").select("categories(name)").eq("influencer_id", user.id),
      supabase.from("campaign_missions").select("description, channel_types(name)").eq("campaign_id", campaignId),
      supabase.from("campaign_keywords").select("keyword").eq("campaign_id", campaignId),
      camp.category_id ? supabase.from("categories").select("name").eq("id", camp.category_id).maybeSingle() : Promise.resolve({ data: null }),
      supabase.rpc("campaign_fit_hint", { p_campaign: campaignId }),
    ]);

  type Named = { name: string } | { name: string }[] | null;
  const nameOf = (n: Named) => (Array.isArray(n) ? n[0]?.name : n?.name) ?? "";
  const fit = fitRaw as { applied: number; recruit_count: number; cat_hit: boolean; channels_have: string[]; channels_missing: string[]; my_completed: number } | null;

  return draftApplyMessage(
    {
      campaign: { title: camp.title, business_name: camp.business_name, category: nameOf(catRow as Named) || null, industry_brief: camp.industry_brief },
      missions: (missions ?? []).map((m) => ({ channel: nameOf(m.channel_types as Named), description: m.description })),
      keywords: (keywords ?? []).map((k) => k.keyword),
      me: {
        name: profile.name,
        bio: inf?.bio ?? null,
        channels: (channels ?? [])
          .map((c) => `${nameOf(c.channel_types as Named)}${c.handle ? ` ${c.handle}` : ""}${c.followers ? ` (팔로워 ${c.followers.toLocaleString()})` : ""}`)
          .filter(Boolean),
        categories: (cats ?? []).map((c) => nameOf(c.categories as Named)).filter(Boolean),
      },
      fit: fit
        ? { applied: fit.applied, recruit_count: fit.recruit_count, cat_hit: fit.cat_hit, channels_have: fit.channels_have ?? [], channels_missing: fit.channels_missing ?? [], my_completed: fit.my_completed }
        : null,
    },
    { userId: user.id, campaignId }
  );
}
