/** 광고주가 직접 답한 가이드 입력값 — AI 가 추측하지 않는 사실 */
export type CampaignGuide = {
  /** 매장·제품 링크 (네이버 플레이스, 인스타그램, 상세페이지 등) */
  reference_url: string;
  /** 꼭 보여줬으면 하는 것 */
  must_include: string[];
  /** 피해야 할 것 */
  avoid: string[];
};

export const EMPTY_GUIDE: CampaignGuide = { reference_url: "", must_include: [], avoid: [] };

/** DB jsonb → 화면 값. 형식이 어긋난 값은 버린다 */
export function parseGuide(raw: unknown): CampaignGuide {
  const g = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const list = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((x) => x.trim()) : []);
  return {
    reference_url: typeof g.reference_url === "string" ? g.reference_url : "",
    must_include: list(g.must_include),
    avoid: list(g.avoid),
  };
}

/** 화면 값 → DB jsonb. 전부 비었으면 null. 링크는 http(s) 만 */
export function cleanGuide(g: CampaignGuide | undefined | null) {
  const list = (v: string[] | undefined) => [...new Set((v ?? []).map((x) => x.trim().slice(0, 120)).filter(Boolean))].slice(0, 8);
  const url = (g?.reference_url ?? "").trim().slice(0, 500);
  const reference_url = /^https?:\/\/\S+$/i.test(url) ? url : null;
  const must_include = list(g?.must_include);
  const avoid = list(g?.avoid);
  if (!reference_url && must_include.length === 0 && avoid.length === 0) return null;
  return { reference_url, must_include, avoid };
}
