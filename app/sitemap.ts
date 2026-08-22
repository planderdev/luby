import { loadDocs } from "@/lib/docs/content";
import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo/site";
import { getStaticSupabase } from "@/lib/supabase/static";

// 캠페인·공개 프로필이 수시로 바뀌므로 1시간마다 재생성
export const revalidate = 3600;

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
  // 공개 프로필을 켠 크리에이터 (/p/[id])
  let creatorEntries: MetadataRoute.Sitemap = [];
  try {
    const { data } = await getStaticSupabase().rpc("list_public_creator_ids", { p_limit: 1000 });
    creatorEntries = (data ?? []).map((c) => ({
      url: `${base}/p/${c.id}`,
      lastModified: new Date(c.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.5,
    }));
  } catch {
    creatorEntries = [];
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
    ...(["", "/en", "/zh"] as const).map((l) => ({
      url: `${base}${l}/c`,
      lastModified: now,
      changeFrequency: "hourly" as const,
      priority: 0.9,
      alternates: { languages: { "ko-KR": `${base}/c`, en: `${base}/en/c`, "zh-CN": `${base}/zh/c`, "x-default": `${base}/c` } },
    })),
    { url: `${base}/docs`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.7 },
    ...loadDocs().flatMap((g) => g.pages.map((p) => ({ url: `${base}/docs/${g.key}/${p.slug}`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.6 }))),
    ...(["", "/en", "/zh"] as const).map((l) => ({
      url: `${base}${l}/creators`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.8,
      alternates: { languages: { "ko-KR": `${base}/creators`, en: `${base}/en/creators`, "zh-CN": `${base}/zh/creators`, "x-default": `${base}/creators` } },
    })),
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
    ...creatorEntries,
  ];
}
