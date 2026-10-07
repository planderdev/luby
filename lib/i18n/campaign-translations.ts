import { unstable_cache } from "next/cache";
import { getStaticSupabase } from "@/lib/supabase/static";
import type { Locale } from "@/lib/i18n/config";
import type { MissionT, OfferingT } from "@/lib/ai/campaign-translate";

/**
 * 공개 페이지(/en, /zh)에서 캠페인 본문을 번역본으로 덮어쓴다. 번역이 없으면 원문(한국어) 그대로.
 * 미션·제공은 원문 문자열로 짝을 맞추므로 RPC 가 돌려주는 순서와 무관하다. 캐시 태그는 공개 캠페인과 같다.
 */
export type TranslationRow = {
  campaign_id: string;
  title: string;
  business_name: string;
  industry_brief: string | null;
  missions: MissionT[];
  offerings: OfferingT[];
  keywords: string[]; // "원문␟번역"
};

const fetchTranslations = unstable_cache(
  async (ids: string[], locale: "en" | "zh"): Promise<TranslationRow[]> => {
    if (ids.length === 0) return [];
    const { data } = await getStaticSupabase()
      .from("campaign_translations")
      .select("campaign_id, title, business_name, industry_brief, missions, offerings, keywords")
      .eq("locale", locale)
      .in("campaign_id", ids);
    return (data as unknown as TranslationRow[] | null) ?? [];
  },
  ["campaign-translations"],
  { revalidate: 300, tags: ["public-campaigns"] }
);

export async function getTranslationMap(ids: string[], locale: Locale): Promise<Map<string, TranslationRow>> {
  if (locale === "ko" || ids.length === 0) return new Map();
  const rows = await fetchTranslations([...new Set(ids)].sort(), locale);
  return new Map(rows.map((r) => [r.campaign_id, r]));
}

type Card = { id: string; title: string; business_name: string };
/** 목록 카드(제목·상호)만 덮어쓴다 */
export function translateCards<T extends Card>(cards: T[], map: Map<string, TranslationRow>): T[] {
  return cards.map((c) => {
    const t = map.get(c.id);
    return t ? { ...c, title: t.title, business_name: t.business_name } : c;
  });
}

type Full = Card & {
  industry_brief: string | null;
  missions: { channel: string; description: string }[];
  keywords: string[];
  offerings: { title: string; description: string | null; estimated_value: number | null }[];
};
/** 상세 페이지 — 본문 전체를 덮어쓴다 */
export function translateCampaignView<T extends Full>(c: T, t: TranslationRow | undefined): T {
  if (!t) return c;
  const mission = new Map(t.missions.map((m) => [m.source, m.description]));
  const offering = new Map(t.offerings.map((o) => [o.source, o]));
  const keyword = new Map(t.keywords.map((k) => k.split("\u001f") as [string, string]));
  return {
    ...c,
    title: t.title,
    business_name: t.business_name,
    industry_brief: c.industry_brief ? t.industry_brief ?? c.industry_brief : c.industry_brief,
    missions: c.missions.map((m) => ({ ...m, description: mission.get(m.description) ?? m.description })),
    offerings: c.offerings.map((o) => { const x = offering.get(o.title); return x ? { ...o, title: x.title, description: o.description ? x.description ?? o.description : o.description } : o; }),
    keywords: c.keywords.map((k) => keyword.get(k) ?? k),
  };
}
