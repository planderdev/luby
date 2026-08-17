/**
 * 크리에이터 프로필 완성도 — 설정 페이지 게이지와 개요 홈 카드에서 공유.
 * 가중치는 매칭·검색 노출에 미치는 영향 순.
 */
export type CreatorProfileFacts = {
  avatarUrl: string | null;
  bio: string | null;
  regionId: string | null;
  channelCount: number;
  channelsWithFollowers: number;
  categoryCount: number;
};

export type CompletenessItem = { key: string; label: string; done: boolean; weight: number; hint: string; href: string };

export function creatorCompleteness(f: CreatorProfileFacts): { percent: number; items: CompletenessItem[]; next: CompletenessItem | null } {
  const items: CompletenessItem[] = [
    { key: "channel", label: "SNS 채널 1개 이상", done: f.channelCount > 0, weight: 30, hint: "채널이 있어야 광고주 검색·AI 매칭에 노출돼요", href: "/dashboard/settings#channels" },
    { key: "category", label: "전문 분야 선택", done: f.categoryCount > 0, weight: 25, hint: "내 업종 캠페인이 우선 추천되고 초대가 늘어요", href: "/dashboard/settings#categories" },
    { key: "followers", label: "채널 팔로워 수 입력", done: f.channelCount > 0 && f.channelsWithFollowers === f.channelCount, weight: 15, hint: "팔로워 수는 예상 도달 계산과 광고주 필터에 쓰여요", href: "/dashboard/settings#channels" },
    { key: "bio", label: "한 줄 소개", done: !!f.bio && f.bio.trim().length >= 10, weight: 15, hint: "광고주가 선정할 때 가장 먼저 읽는 문장이에요", href: "/dashboard/settings" },
    { key: "region", label: "활동 지역", done: !!f.regionId, weight: 10, hint: "지역 기반 캠페인 추천에 필요해요", href: "/dashboard/settings" },
    { key: "avatar", label: "프로필 사진", done: !!f.avatarUrl, weight: 5, hint: "사진이 있는 프로필이 선정률이 높아요", href: "/dashboard/settings" },
  ];
  const percent = items.reduce((s, i) => s + (i.done ? i.weight : 0), 0);
  const next = items.find((i) => !i.done) ?? null;
  return { percent, items, next };
}
