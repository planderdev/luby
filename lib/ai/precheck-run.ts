import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { precheckCampaign, type Precheck } from "./campaign-precheck";
import type { AiContext } from "./client";

/**
 * 캠페인 데이터를 모아 AI 사전 점검을 실행하고 campaigns.ai_precheck 에 저장.
 * 운영자 액션(세션 클라이언트)과 자동 실행 웹훅(service_role) 공용.
 */
export async function runCampaignPrecheck(
  client: SupabaseClient<Database>,
  campaignId: string,
  ctx?: Omit<AiContext, "feature">
): Promise<{ ok: true; result: Precheck; checkedAt: string } | { ok: false; error: string }> {
  const { data: c } = await client
    .from("campaigns")
    .select("id, title, business_name, industry_brief, point_amount, recruit_count, recruit_start, recruit_end, category_id, promotion_type_id")
    .eq("id", campaignId)
    .maybeSingle();
  if (!c) return { ok: false, error: "캠페인을 찾을 수 없습니다." };

  const [{ data: ms }, { data: kw }, { data: of }, { data: cat }, { data: pt }] = await Promise.all([
    client.from("campaign_missions").select("description, channel_types(name)").eq("campaign_id", campaignId),
    client.from("campaign_keywords").select("keyword").eq("campaign_id", campaignId),
    client.from("campaign_offerings").select("title, description, estimated_value").eq("campaign_id", campaignId),
    c.category_id ? client.from("categories").select("name").eq("id", c.category_id).maybeSingle() : Promise.resolve({ data: null }),
    c.promotion_type_id ? client.from("promotion_types").select("name").eq("id", c.promotion_type_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  type Named = { name: string } | { name: string }[] | null;
  const nameOf = (n: Named) => (Array.isArray(n) ? n[0]?.name : n?.name) ?? "";
  const days = Math.max(1, Math.round((new Date(c.recruit_end).getTime() - new Date(c.recruit_start).getTime()) / 864e5));

  const r = await precheckCampaign(
    {
      title: c.title,
      businessName: c.business_name,
      industryBrief: c.industry_brief,
      category: cat?.name ?? null,
      promotionType: pt?.name ?? null,
      missions: (ms ?? []).map((m) => ({ channel: nameOf(m.channel_types as Named), description: m.description })),
      keywords: (kw ?? []).map((k) => k.keyword),
      offerings: (of ?? []).map((o) => ({ title: o.title, description: o.description, estimatedValue: o.estimated_value })),
      pointAmount: c.point_amount,
      recruitCount: c.recruit_count,
      recruitDays: days,
    },
    { ...ctx, campaignId }
  );
  if (!r.ok) return r;
  const checkedAt = new Date().toISOString();
  await client.from("campaigns").update({ ai_precheck: r.result, ai_prechecked_at: checkedAt }).eq("id", campaignId);
  return { ok: true, result: r.result, checkedAt };
}
