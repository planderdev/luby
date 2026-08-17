import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo/site";
import { getStaticSupabase } from "@/lib/supabase/static";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const now = new Date();

  // 모집 중 캠페인 공개 페이지 (/c/[id]) — 검색 유입용
  let campaignEntries: MetadataRoute.Sitemap = [];
  try {
    const { data } = await getStaticSupabase().rpc("list_public_campaign_ids", { p_limit: 500 });
    campaignEntries = (data ?? []).map((c) => ({
      url: `${base}/c/${c.id}`,
      lastModified: new Date(c.updated_at),
      changeFrequency: "daily" as const,
      priority: 0.7,
    }));
  } catch {
    campaignEntries = [];
  }

  // Landing page is served in 3 languages; declare the alternates so search
  // engines surface the right locale.
  const languages = {
    "ko-KR": base,
    en: `${base}/en`,
    "zh-CN": `${base}/zh`,
    "x-default": base,
  };

  return [
    {
      url: base,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
      alternates: { languages },
    },
    {
      url: `${base}/en`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
      alternates: { languages },
    },
    {
      url: `${base}/zh`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
      alternates: { languages },
    },
    {
      url: `${base}/signup`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${base}/login`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${base}/terms`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${base}/privacy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    ...campaignEntries,
  ];
}
