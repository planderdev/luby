"use server";

import { getAnthropic, AI_MODEL } from "@/lib/ai/client";
import { buildSystemBlocks, fetchCatalog } from "@/lib/ai/system";
import { createClient } from "@/lib/supabase/server";
import { getEntitlements } from "@/lib/plans/entitlements";

export type InfluencerMatch = {
  influencer_id: string;
  score: number;
  reason: string;
};

export type MatchResult =
  | { ok: true; matches: InfluencerMatch[] }
  | { ok: false; error: string };

/**
 * Asks AI to rank the most suitable influencers for a campaign.
 * Returns top 5 with score (0-100) + plain-Korean reasoning.
 *
 * 서버 액션이 throw하면 클라이언트가 에러 페이지로 튕기므로,
 * 모든 예외를 {ok:false}로 흡수하는 가드 래퍼.
 */
export async function matchInfluencers(campaignId: string): Promise<MatchResult> {
  try {
    return await matchInfluencersInner(campaignId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `AI 매칭 실패: ${msg}` };
  }
}

async function matchInfluencersInner(campaignId: string): Promise<MatchResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  // Load campaign + verify ownership
  const { data: campaign } = await supabase
    .from("campaigns")
    .select(
      "id, advertiser_id, title, business_name, industry_brief, region_id, category_id, recruit_count"
    )
    .eq("id", campaignId)
    .maybeSingle();
  if (!campaign) return { ok: false, error: "캠페인을 찾을 수 없습니다." };
  if (campaign.advertiser_id !== user.id) {
    // Operators can also see; for now restrict to owner
    return { ok: false, error: "권한이 없습니다." };
  }

  // 플랜 게이트: AI 매칭은 BUSINESS 전용 (토큰 비용이 드는 기능이라 서버에서 차단)
  const ent = await getEntitlements(user.id);
  if (!ent.aiMatching) {
    return {
      ok: false,
      error: "AI 매칭은 BUSINESS 플랜 전용 기능입니다. 요금제 페이지에서 업그레이드해주세요.",
    };
  }

  // Load campaign channels (we want influencers active on at least one)
  const { data: campChannels } = await supabase
    .from("campaign_channels")
    .select("channel_type_id")
    .eq("campaign_id", campaignId);
  const wantedChannelIds = (campChannels ?? []).map((c) => c.channel_type_id);

  // Load approved influencer pool (max 50 to keep prompt size sane)
  const { data: influencers } = await supabase
    .from("influencers")
    .select("profile_id, region_id, bio, total_points")
    .limit(50);
  if (!influencers || influencers.length === 0) {
    return { ok: true, matches: [] };
  }

  const ids = influencers.map((i) => i.profile_id);
  const [profilesRes, channelsRes] = await Promise.all([
    supabase.from("profiles").select("id, name").in("id", ids).eq("approved", true),
    supabase
      .from("influencer_channels")
      .select("influencer_id, channel_type_id, handle, followers")
      .in("influencer_id", ids),
  ]);

  const profileById = new Map((profilesRes.data ?? []).map((p) => [p.id, p]));
  const channelsByInfluencer = new Map<
    string,
    { channel_type_id: string; handle: string | null; followers: number }[]
  >();
  for (const c of channelsRes.data ?? []) {
    const arr = channelsByInfluencer.get(c.influencer_id) ?? [];
    arr.push({
      channel_type_id: c.channel_type_id,
      handle: c.handle,
      followers: c.followers ?? 0,
    });
    channelsByInfluencer.set(c.influencer_id, arr);
  }

  // Filter to approved + (if campaign has channel preferences) at least one matching channel
  const eligible = influencers.filter((inf) => {
    if (!profileById.has(inf.profile_id)) return false;
    if (wantedChannelIds.length === 0) return true;
    const chs = channelsByInfluencer.get(inf.profile_id) ?? [];
    return chs.some((c) => wantedChannelIds.includes(c.channel_type_id));
  });

  if (eligible.length === 0) {
    return { ok: true, matches: [] };
  }

  const catalog = await fetchCatalog();
  const channelNameById = new Map(catalog.channels.map((c) => [c.id, c.name]));
  const regionNameById = new Map(catalog.regions.map((r) => [r.id, `${r.flag} ${r.name}`]));
  const categoryNameById = new Map(catalog.categories.map((c) => [c.id, c.name]));

  // Build influencer summary block
  const influencerSummaries = eligible
    .map((inf) => {
      const p = profileById.get(inf.profile_id)!;
      const chs = channelsByInfluencer.get(inf.profile_id) ?? [];
      const chSummary =
        chs.length === 0
          ? "(채널 정보 없음)"
          : chs
              .map(
                (c) =>
                  `${channelNameById.get(c.channel_type_id) ?? "?"}: ${c.handle ?? ""} (${c.followers.toLocaleString()}명)`
              )
              .join(", ");
      const region = inf.region_id ? regionNameById.get(inf.region_id) ?? "" : "";
      return `- id:${inf.profile_id} | ${p.name} | ${region} | 채널: ${chSummary}${inf.bio ? ` | "${inf.bio.slice(0, 100)}"` : ""}`;
    })
    .join("\n");

  const userPrompt = `다음 캠페인에 가장 잘 어울리는 인플루언서 상위 5명을 추천해주세요.

## 캠페인
- 제목: ${campaign.title}
- 상호명: ${campaign.business_name}
- 업종 설명: ${campaign.industry_brief ?? "(없음)"}
- 카테고리: ${categoryNameById.get(campaign.category_id) ?? "?"}
- 지역: ${regionNameById.get(campaign.region_id) ?? "?"}
- 발행 채널: ${wantedChannelIds.map((id) => channelNameById.get(id) ?? "?").join(", ") || "(미지정)"}
- 모집 인원: ${campaign.recruit_count}명

## 등록된 인플루언서 풀 (총 ${eligible.length}명)
${influencerSummaries}

위 풀에서 캠페인과 가장 잘 매칭되는 인플루언서 5명을 골라주세요.

매칭 기준:
- 채널 적합성 (해당 캠페인 채널에서 활동하는가)
- 지역 적합성
- 카테고리·업종 적합성 (bio 참고)
- 팔로워 규모와 캠페인 모집 인원의 균형 (작은 캠페인엔 마이크로/나노 인플루언서가 더 적합)

각 인플루언서마다 0~100 점수와 추천 이유 (한국어, 80자 이내)를 작성해주세요.
풀에 인플루언서가 5명 미만이면 그 만큼만 반환하세요.`;

  try {
    const client = getAnthropic();
    const response = await client.messages.create({
      model: AI_MODEL,
      // max_tokens는 thinking + 응답 JSON의 합산 상한 — 부족하면 JSON이 잘린다
      max_tokens: 8192,
      thinking: { type: "adaptive" },
      system: buildSystemBlocks(catalog),
      output_config: {
        effort: "medium",
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              // minItems/maxItems/minimum/maximum은 Anthropic 구조화 출력
              // 미지원(400) — 개수·범위는 프롬프트 + 서버 클램핑으로 처리.
              matches: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    influencer_id: { type: "string" },
                    score: { type: "integer" },
                    reason: { type: "string" },
                  },
                  required: ["influencer_id", "score", "reason"],
                },
              },
            },
            required: ["matches"],
          },
        },
      },
      messages: [{ role: "user", content: userPrompt }],
    });

    if (response.stop_reason === "max_tokens") {
      return { ok: false, error: "AI 응답이 길이 제한에 걸렸습니다. 다시 시도해주세요." };
    }

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return { ok: false, error: "AI 응답을 받지 못했습니다." };
    }
    const parsed = JSON.parse(textBlock.text) as { matches: InfluencerMatch[] };

    // Filter out any IDs not in the eligible pool (defensive — model could hallucinate)
    const eligibleIds = new Set(eligible.map((e) => e.profile_id));
    // 스키마 제약 미지원 대체: 점수 0~100 클램핑 + 상위 5명 제한
    const filtered = parsed.matches
      .filter((m) => eligibleIds.has(m.influencer_id))
      .map((m) => ({ ...m, score: Math.max(0, Math.min(100, m.score)) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    return { ok: true, matches: filtered };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `AI 호출 실패: ${msg}` };
  }
}
