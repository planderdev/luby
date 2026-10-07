import Link from "next/link";
import { Sparkles, Check, X, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { dashboardDict } from "@/lib/i18n/app/dashboard";
import type { Locale } from "@/lib/i18n/config";

type Hint = {
  applied: number;
  recruit_count: number;
  days_left: number | null;
  cat_hit: boolean;
  region_hit: boolean;
  channels_have: string[];
  channels_missing: string[];
  my_applied: number;
  my_selected: number;
  my_completed: number;
};

/**
 * 크리에이터용 "선정 가능성" 힌트 — 경쟁률 + 분야/지역/채널 일치 + 내 이력으로 단순 등급(높음/보통/낮음)과 개선 팁.
 * 광고주의 AI 적합도 점수 등 내부 정보는 쓰지 않는다. 모집중·마감 캠페인에서, 선정 전까지만 표시.
 */
export async function FitHint({ campaignId, applicationStatus, locale = "ko" }: { campaignId: string; applicationStatus: string | null; locale?: Locale }) {
  const t = dashboardDict[locale].fit;
  if (applicationStatus && applicationStatus !== "pending") return null;
  const supabase = await createClient();
  const { data } = await supabase.rpc("campaign_fit_hint", { p_campaign: campaignId });
  const h = data as Hint | null;
  if (!h) return null;

  const ratio = h.recruit_count > 0 ? h.applied / h.recruit_count : 0;
  const matchScore = (h.cat_hit ? 2 : 0) + (h.region_hit ? 1 : 0) + (h.channels_have.length > 0 ? 1 : 0);
  const channelsOk = h.channels_missing.length === 0 || h.channels_have.length > 0;
  let level: "high" | "mid" | "low";
  if (!channelsOk) level = "low";
  else if (matchScore >= 3 && ratio < 2) level = "high";
  else if (matchScore >= 2 || ratio < 1) level = "mid";
  else level = "low";

  const label = t.level[level];
  const tone = { high: "bg-success-soft text-success", mid: "bg-accent-soft text-accent-ink", low: "bg-muted text-muted-foreground" }[level];
  const tips: string[] = [];
  if (h.channels_missing.length > 0 && h.channels_have.length === 0) tips.push(t.tipNoChannel(h.channels_missing.join("·")));
  else if (h.channels_missing.length > 0) tips.push(t.tipMoreChannel(h.channels_missing.join("·")));
  if (!h.cat_hit) tips.push(t.tipCategory);
  if (ratio >= 2) tips.push(t.tipCompetition);
  if (h.applied < h.recruit_count) tips.push(t.tipEarly);
  const showTips = !applicationStatus;

  return (
    <section className="rounded-3xl glass-card p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Sparkles className="size-3.5" /> {t.title}
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone}`}>{label}</span>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="display text-2xl font-semibold tabular-nums">{ratio.toFixed(1)}:1</span>
        <span className="text-xs text-muted-foreground">{t.competition(h.applied, h.recruit_count, h.days_left)}</span>
      </div>
      <ul className="mt-3 space-y-1.5 text-xs">
        {[
          { ok: h.cat_hit, t: t.catHit },
          { ok: h.region_hit, t: t.regionHit },
          { ok: h.channels_have.length > 0, t: h.channels_have.length > 0 ? t.channelsHave(h.channels_have.join("·")) : h.channels_missing.length > 0 ? t.channelsNeed(h.channels_missing.join("·")) : t.noChannelRule },
        ].map((r) => (
          <li key={r.t} className="flex items-center gap-2">
            {r.ok ? <Check className="size-3.5 text-success" /> : <X className="size-3.5 text-muted-foreground" />}
            <span className={r.ok ? "" : "text-muted-foreground"}>{r.t}</span>
          </li>
        ))}
        {h.my_completed > 0 && (
          <li className="flex items-center gap-2">
            <TrendingUp className="size-3.5 text-success" /> {t.completed(h.my_completed)}
          </li>
        )}
      </ul>
      {showTips && tips.length > 0 && (
        <div className="mt-3 rounded-2xl bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground">
          {tips.slice(0, 2).map((t, i) => <p key={i}>{t}</p>)}
          {(h.channels_missing.length > 0 || !h.cat_hit) && (
            <Link href="/dashboard/settings" className="mt-1 inline-block font-medium text-foreground underline underline-offset-2">{t.editProfile}</Link>
          )}
        </div>
      )}
      <p className="mt-2 text-[10px] text-muted-foreground">{t.disclaimer}</p>
    </section>
  );
}
