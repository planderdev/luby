/** 공개 캠페인 페이지 유입원 라벨 (campaign_page_views.source) */
export const VIEW_SOURCE_LABEL: Record<string, string> = {
  qr: "QR 포스터",
  link: "공유 링크",
  dir: "캠페인 디렉터리",
  ref: "크리에이터 추천",
  direct: "직접·검색·SNS",
};
export const VIEW_SOURCE_ORDER = ["qr", "link", "dir", "ref", "direct"] as const;

/** 크리에이터 공개 프로필용 라벨 (명함 QR · 포트폴리오 링크 · 디렉터리) */
export const CREATOR_VIEW_SOURCE_LABEL: Record<string, string> = {
  qr: "QR 명함",
  link: "포트폴리오 링크",
  dir: "크리에이터 디렉터리",
  ref: "추천",
  direct: "직접·검색·SNS",
};

export function viewSourceRows(bySource: Record<string, number | { views: number }> | null | undefined, labels: Record<string, string> = VIEW_SOURCE_LABEL) {
  if (!bySource) return [] as { key: string; label: string; views: number }[];
  return VIEW_SOURCE_ORDER.map((k) => {
    const v = bySource[k];
    const views = typeof v === "number" ? v : v?.views ?? 0;
    return { key: k, label: labels[k] ?? k, views };
  }).filter((r) => r.views > 0);
}
