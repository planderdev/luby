import Link from "next/link";
import { Sparkles, Check, X, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

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
export async function FitHint({ campaignId, applicationStatus }: { campaignId: string; applicationStatus: string | null }) {
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

  const label = { high: "높음", mid: "보통", low: "낮음" }[level];
  const tone = { high: "bg-success-soft text-success", mid: "bg-accent-soft text-accent-ink", low: "bg-muted text-muted-foreground" }[level];
  const tips: string[] = [];
  if (h.channels_missing.length > 0 && h.channels_have.length === 0) tips.push(`이 캠페인 채널(${h.channels_missing.join("·")})이 내 프로필에 없어요. 채널을 등록하면 선정 대상에 들어갑니다.`);
  else if (h.channels_missing.length > 0) tips.push(`${h.channels_missing.join("·")} 채널도 등록하면 미션 전체를 맡을 수 있어 유리해요.`);
  if (!h.cat_hit) tips.push("전문 분야에 이 캠페인 분야를 추가하면 추천·선정에 유리해요.");
  if (ratio >= 2) tips.push("경쟁이 높아요. 응모 메시지에 비슷한 콘텐츠 경험과 구체적인 기획을 적어 주세요.");
  if (h.applied < h.recruit_count) tips.push("아직 모집 인원보다 응모가 적어요 — 지금 응모하면 먼저 검토됩니다.");
  const showTips = !applicationStatus;

  return (
    <section className="rounded-3xl glass-card p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Sparkles className="size-3.5" /> 선정 가능성
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone}`}>{label}</span>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="display text-2xl font-semibold tabular-nums">{ratio.toFixed(1)}:1</span>
        <span className="text-xs text-muted-foreground">경쟁률 · 응모 {h.applied} / 모집 {h.recruit_count}{h.days_left !== null ? ` · D-${h.days_left}` : ""}</span>
      </div>
      <ul className="mt-3 space-y-1.5 text-xs">
        {[
          { ok: h.cat_hit, t: "내 전문 분야와 일치" },
          { ok: h.region_hit, t: "내 활동 지역과 일치" },
          { ok: h.channels_have.length > 0, t: h.channels_have.length > 0 ? `채널 보유: ${h.channels_have.join("·")}` : h.channels_missing.length > 0 ? `채널 필요: ${h.channels_missing.join("·")}` : "채널 조건 없음" },
        ].map((r) => (
          <li key={r.t} className="flex items-center gap-2">
            {r.ok ? <Check className="size-3.5 text-success" /> : <X className="size-3.5 text-muted-foreground" />}
            <span className={r.ok ? "" : "text-muted-foreground"}>{r.t}</span>
          </li>
        ))}
        {h.my_completed > 0 && (
          <li className="flex items-center gap-2">
            <TrendingUp className="size-3.5 text-success" /> 완료한 체험 {h.my_completed}건 — 이력이 선정에 도움이 돼요
          </li>
        )}
      </ul>
      {showTips && tips.length > 0 && (
        <div className="mt-3 rounded-2xl bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground">
          {tips.slice(0, 2).map((t, i) => <p key={i}>{t}</p>)}
          {(h.channels_missing.length > 0 || !h.cat_hit) && (
            <Link href="/dashboard/settings" className="mt-1 inline-block font-medium text-foreground underline underline-offset-2">프로필 보완하기 →</Link>
          )}
        </div>
      )}
      <p className="mt-2 text-[10px] text-muted-foreground">참고용 추정이며 최종 선정은 광고주가 결정합니다.</p>
    </section>
  );
}
