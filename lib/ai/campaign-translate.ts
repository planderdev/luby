import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { trackedCreate, AI_MODEL_FAST, stopReasonError } from "./client";

/**
 * 공개 캠페인 페이지(/en, /zh)용 캠페인 본문 번역 — 제목·상호·브리프·미션·제공 내역·키워드를 영어·중국어(간체)로.
 * 결과는 campaign_translations 에 저장하고 원문 해시가 같으면 다시 번역하지 않는다.
 * 트리거(승인·수정 → /api/ai/translate-campaign)와 백필 스크립트가 같은 함수를 쓴다. 시스템 호출(사용자 한도 없음).
 */
export type TranslationLocale = "en" | "zh";
export type MissionT = { channel: string; source: string; description: string };
export type OfferingT = { source: string; title: string; description: string | null };
export type KeywordT = { source: string; keyword: string };
export type CampaignTranslation = {
  title: string;
  business_name: string;
  industry_brief: string | null;
  missions: MissionT[];
  offerings: OfferingT[];
  keywords: KeywordT[];
};

type Source = {
  title: string;
  business_name: string;
  industry_brief: string | null;
  missions: { channel: string; description: string }[];
  offerings: { title: string; description: string | null }[];
  keywords: string[];
};

const LOCALE_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    business_name: { type: "string" },
    industry_brief: { type: "string" },
    missions: { type: "array", items: { type: "object", properties: { description: { type: "string" } }, required: ["description"], additionalProperties: false } },
    offerings: { type: "array", items: { type: "object", properties: { title: { type: "string" }, description: { type: "string" } }, required: ["title", "description"], additionalProperties: false } },
    keywords: { type: "array", items: { type: "string" } },
  },
  required: ["title", "business_name", "industry_brief", "missions", "offerings", "keywords"],
  additionalProperties: false,
} as const;
const SCHEMA = { type: "object", properties: { en: LOCALE_SCHEMA, zh: LOCALE_SCHEMA }, required: ["en", "zh"], additionalProperties: false } as const;

export function hashSource(src: Source): string {
  return createHash("sha1").update(JSON.stringify(src)).digest("hex");
}

export async function loadCampaignSource(client: SupabaseClient<Database>, campaignId: string): Promise<{ status: string; src: Source } | null> {
  const [{ data: c }, { data: missions }, { data: offerings }, { data: keywords }] = await Promise.all([
    client.from("campaigns").select("id, status, title, business_name, industry_brief").eq("id", campaignId).maybeSingle(),
    client.from("campaign_missions").select("description, channel_types(name)").eq("campaign_id", campaignId),
    client.from("campaign_offerings").select("title, description").eq("campaign_id", campaignId),
    client.from("campaign_keywords").select("keyword").eq("campaign_id", campaignId),
  ]);
  if (!c) return null;
  return {
    status: c.status,
    src: {
      title: c.title,
      business_name: c.business_name,
      industry_brief: c.industry_brief ?? null,
      missions: (missions ?? []).map((m) => ({ channel: (m.channel_types as unknown as { name: string } | null)?.name ?? "", description: m.description })),
      offerings: (offerings ?? []).map((o) => ({ title: o.title, description: o.description ?? null })),
      keywords: (keywords ?? []).map((k) => k.keyword),
    },
  };
}

type Result = { ok: true; skipped: boolean; locales: TranslationLocale[]; model?: string } | { ok: false; error: string };

export async function translateCampaign(admin: SupabaseClient<Database>, campaignId: string, opts: { force?: boolean } = {}): Promise<Result> {
  const loaded = await loadCampaignSource(admin, campaignId);
  if (!loaded) return { ok: false, error: "campaign not found" };
  if (!["open", "closed", "completed"].includes(loaded.status)) return { ok: true, skipped: true, locales: [] }; // 비공개 상태는 번역하지 않는다
  const { src } = loaded;
  const hash = hashSource(src);
  if (!opts.force) {
    const { data: existing } = await admin.from("campaign_translations").select("locale, source_hash").eq("campaign_id", campaignId);
    const fresh = new Set((existing ?? []).filter((r) => r.source_hash === hash).map((r) => r.locale));
    if (fresh.has("en") && fresh.has("zh")) return { ok: true, skipped: true, locales: [] };
  }

  const prompt = `You translate a Korean influencer-marketing campaign ("체험단") listing into natural English and Simplified Chinese for creators who will apply to it. Return JSON only.
Rules:
- Keep the meaning and marketing tone; do not add or drop facts. Keep brand/product/place names (transliterate when there is no common foreign name, and keep the original in parentheses once in the title if helpful). Keep numbers, dates, URLs, @handles and hashtags as they are; translate hashtag words only when they are generic (e.g. #광고 → #ad / #广告).
- Platform names stay in their usual form (Instagram, YouTube, Xiaohongshu/小红书, Douyin/抖音, TikTok, Blog, Threads, Lemon8).
- Translate the arrays item by item in the same order and the same length. industry_brief: empty string when the source is empty. offerings[].description: empty string when the source is empty.
- Chinese: Simplified Chinese (zh-CN), mainland reader friendly.

Source (Korean):
${JSON.stringify(src)}`;

  try {
    const r = await trackedCreate(
      {
        model: AI_MODEL_FAST,
        max_tokens: 6000,
        thinking: { type: "adaptive" },
        output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA as unknown as Record<string, unknown> } },
        messages: [{ role: "user", content: prompt }],
      },
      { feature: "campaign_translate", campaignId }
    );
    const stopErr = stopReasonError(r.stop_reason);
    if (stopErr) return { ok: false, error: stopErr };
    const text = r.content.find((b) => b.type === "text")?.text ?? "";
    const parsed = JSON.parse(text) as Record<TranslationLocale, { title: string; business_name: string; industry_brief: string; missions: { description: string }[]; offerings: { title: string; description: string }[]; keywords: string[] }>;
    const now = new Date().toISOString();
    for (const locale of ["en", "zh"] as TranslationLocale[]) {
      const t = parsed[locale];
      if (!t?.title) return { ok: false, error: `empty translation (${locale})` };
      const row = {
        campaign_id: campaignId,
        locale,
        title: t.title,
        business_name: t.business_name || src.business_name,
        industry_brief: src.industry_brief ? t.industry_brief || src.industry_brief : null,
        missions: src.missions.map((m, i) => ({ channel: m.channel, source: m.description, description: t.missions?.[i]?.description || m.description })) satisfies MissionT[],
        offerings: src.offerings.map((o, i) => ({ source: o.title, title: t.offerings?.[i]?.title || o.title, description: o.description ? t.offerings?.[i]?.description || o.description : null })) satisfies OfferingT[],
        keywords: src.keywords.map((k, i) => `${k}\u001f${t.keywords?.[i] || k}`), // "원문␟번역" — text[] 하나로 원문·번역 쌍 보관
        source_hash: hash,
        model: r.model,
        updated_at: now,
      };
      const { error } = await admin.from("campaign_translations").upsert(row, { onConflict: "campaign_id,locale" });
      if (error) return { ok: false, error: error.message };
    }
    return { ok: true, skipped: false, locales: ["en", "zh"], model: r.model };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
