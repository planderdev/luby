/** 공개 캠페인 페이지 유입원 라벨 (campaign_page_views.source) */
export const VIEW_SOURCE_LABEL: Record<string, string> = {
  qr: "QR 포스터",
  link: "공유 링크",
  dir: "캠페인 디렉터리",
  ref: "크리에이터 추천",
  direct: "직접·검색·SNS",
};
export const VIEW_SOURCE_ORDER = ["qr", "link", "dir", "ref", "direct"] as const;

export function viewSourceRows(bySource: Record<string, number | { views: number }> | null | undefined) {
  if (!bySource) return [] as { key: string; label: string; views: number }[];
  return VIEW_SOURCE_ORDER.map((k) => {
    const v = bySource[k];
    const views = typeof v === "number" ? v : v?.views ?? 0;
    return { key: k, label: VIEW_SOURCE_LABEL[k], views };
  }).filter((r) => r.views > 0);
}
