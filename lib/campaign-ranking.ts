/**
 * 크리에이터 맞춤 캠페인 랭킹 — 캠페인 목록(추천순)과 개요 홈 위젯이 공유.
 *
 * 점수: 내 전문 분야 일치 +3 · 내 활동 지역 일치 +2 · 마감 3일 이내 +1 · 이미 응모 −10
 */
export type RankableCampaign = {
  id: string;
  category_id: string | null;
  region_id: string | null;
  recruit_end: string;
};

export type CreatorSignals = {
  categoryIds: Set<string>;
  regionId: string | null;
  appliedCampaignIds: Set<string>;
};

const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;

export function scoreCampaign(c: RankableCampaign, s: CreatorSignals, now = Date.now()): number {
  let score = 0;
  if (c.category_id && s.categoryIds.has(c.category_id)) score += 3;
  if (s.regionId && c.region_id === s.regionId) score += 2;
  const msLeft = new Date(c.recruit_end).getTime() - now;
  if (msLeft > 0 && msLeft < THREE_DAYS) score += 1;
  if (s.appliedCampaignIds.has(c.id)) score -= 10;
  return score;
}

export function rankCampaigns<T extends RankableCampaign>(list: T[], s: CreatorSignals): T[] {
  const now = Date.now();
  return [...list].sort((a, b) => scoreCampaign(b, s, now) - scoreCampaign(a, s, now));
}

/** 카드 배지 라벨 ("응모함" | "내 분야" | "내 지역") */
export function campaignBadges(c: RankableCampaign, s: CreatorSignals): string[] {
  const out: string[] = [];
  if (s.appliedCampaignIds.has(c.id)) out.push("응모함");
  if (c.category_id && s.categoryIds.has(c.category_id)) out.push("내 분야");
  if (s.regionId && c.region_id === s.regionId) out.push("내 지역");
  return out;
}

export function hasPersonalSignal(s: CreatorSignals): boolean {
  return s.categoryIds.size > 0 || !!s.regionId;
}
