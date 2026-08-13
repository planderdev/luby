"use server";

import { createClient } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { getEntitlements } from "@/lib/plans/entitlements";
import {
  reviewSubmissionContent,
  type ContentReview,
} from "@/lib/ai/content-review";

type Result = { ok: true; review: ContentReview } | { ok: false; error: string };

/**
 * AI 콘텐츠 사전 검수 — 제출물을 캠페인 미션과 대조해 체크리스트 생성.
 * 본인 캠페인 + BUSINESS 이상만. 결과는 submissions.ai_review에 캐시.
 */
export async function aiReviewSubmission(submissionId: string): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  // RLS로 본인 관련 제출물만 보임 + 캠페인 소유권 명시 확인
  const { data: sub } = await supabase
    .from("submissions")
    .select(
      "id, content_url, note, applications!inner(id, campaign_id, campaigns!inner(id, title, business_name, industry_brief, promotion_type_id, advertiser_id))"
    )
    .eq("id", submissionId)
    .maybeSingle();
  if (!sub) return { ok: false, error: "제출물을 찾을 수 없습니다." };

  const application = sub.applications as unknown as {
    campaign_id: string;
    campaigns: {
      id: string;
      title: string;
      business_name: string;
      industry_brief: string | null;
      promotion_type_id: string | null;
      advertiser_id: string;
    };
  };
  const campaign = application.campaigns;
  if (campaign.advertiser_id !== user.id) {
    return { ok: false, error: "본인 캠페인의 제출물만 검수할 수 있습니다." };
  }

  const ent = await getEntitlements(user.id);
  if (!ent.aiMatching) {
    return { ok: false, error: "AI 사전 검수는 BUSINESS 플랜부터 이용할 수 있어요." };
  }

  // 캠페인 미션·키워드·홍보유형 수집
  const [missions, keywords, promotion] = await Promise.all([
    supabase
      .from("campaign_missions")
      .select("channel_type_id, description, required")
      .eq("campaign_id", campaign.id),
    supabase.from("campaign_keywords").select("keyword").eq("campaign_id", campaign.id),
    campaign.promotion_type_id
      ? supabase
          .from("promotion_types")
          .select("name")
          .eq("id", campaign.promotion_type_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const channelIds = [...new Set((missions.data ?? []).map((m) => m.channel_type_id))];
  const { data: channelTypes } = channelIds.length
    ? await supabase.from("channel_types").select("id, name").in("id", channelIds)
    : { data: [] };
  const channelNameById = new Map((channelTypes ?? []).map((c) => [c.id, c.name]));

  const result = await reviewSubmissionContent({
    campaignTitle: campaign.title,
    businessName: campaign.business_name,
    industryBrief: campaign.industry_brief,
    promotionType: promotion.data?.name ?? null,
    missions: (missions.data ?? []).map((m) => ({
      channel: channelNameById.get(m.channel_type_id) ?? "채널",
      description: m.description,
      required: m.required,
    })),
    keywords: (keywords.data ?? []).map((k) => k.keyword),
    contentUrl: sub.content_url,
    note: sub.note,
  });
  if (!result.ok) return result;

  // 결과 캐시 (service_role — submissions에 광고주 UPDATE 정책 없음)
  const admin = getAdminSupabase();
  await admin
    .from("submissions")
    .update({
      ai_review: JSON.parse(JSON.stringify(result.review)),
      ai_reviewed_at: new Date().toISOString(),
    })
    .eq("id", submissionId);

  return { ok: true, review: result.review };
}
