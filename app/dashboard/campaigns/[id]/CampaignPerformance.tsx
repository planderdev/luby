import { BarChart3, Users, Radio, Coins, Timer } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ReportShareButton } from "./ReportShareButton";
import type { ReportSummary } from "@/lib/ai/report-summary";

/**
 * 광고주용 캠페인 성과 요약 — 응모→선정→제출→승인 퍼널, 모집 진행률,
 * 선정 크리에이터 채널별 도달(팔로워 합), 지급 포인트, 마감 D-day.
 * 소유주만 렌더 (호출부에서 isOwner 가드).
 */
export async function CampaignPerformance({
  campaignId,
  recruitCount,
  recruitEnd,
  pointAmount,
  status,
  reportToken,
  reportSummary,
  reportSummaryAt,
}: {
  campaignId: string;
  recruitCount: number;
  recruitEnd: string;
  pointAmount: number;
  status: string;
  reportToken: string | null;
  reportSummary: ReportSummary | null;
  reportSummaryAt: string | null;
}) {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://luby.im").replace(/\/$/, "");
  const supabase = await createClient();

  const { data: apps } = await supabase
    .from("applications")
    .select("id, status, influencer_id")
    .eq("campaign_id", campaignId);
  const applications = apps ?? [];
  const applied = applications.length;
  const selectedRows = applications.filter((a) => a.status === "selected" || a.status === "completed");
  const selected = selectedRows.length;

  const appIds = selectedRows.map((a) => a.id);
  const influencerIds = [...new Set(selectedRows.map((a) => a.influencer_id))];

  const [{ data: subs }, { data: channels }, { data: channelTypes }] = await Promise.all([
    appIds.length
      ? supabase.from("submissions").select("application_id, status").in("application_id", appIds)
      : Promise.resolve({ data: [] as { application_id: string; status: string }[] }),
    influencerIds.length
      ? supabase
          .from("influencer_channels")
          .select("influencer_id, channel_type_id, followers")
          .in("influencer_id", influencerIds)
      : Promise.resolve({ data: [] as { influencer_id: string; channel_type_id: string; followers: number }[] }),
    supabase.from("channel_types").select("id, name").eq("active", true).order("sort_order"),
  ]);
  const submitted = (subs ?? []).length; // 제출물 행이 있으면 제출한 것 (재제출 대기 포함)
  const approved = (subs ?? []).filter((s) => s.status === "approved").length;

  // 채널별 도달 (선정 크리에이터 팔로워 합)
  const nameById = new Map((channelTypes ?? []).map((c) => [c.id, c.name]));
  const reachByChannel = new Map<string, number>();
  let totalReach = 0;
  for (const ch of channels ?? []) {
    const n = nameById.get(ch.channel_type_id) ?? "기타";
    reachByChannel.set(n, (reachByChannel.get(n) ?? 0) + (ch.followers ?? 0));
    totalReach += ch.followers ?? 0;
  }
  const reachRows = [...reachByChannel.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);

  const daysLeft = Math.ceil((new Date(recruitEnd).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  const fillRate = recruitCount > 0 ? Math.min(100, Math.round((selected / recruitCount) * 100)) : 0;
  const pointsPaid = approved * pointAmount;

  const pct = (num: number, den: number) => (den > 0 ? Math.round((num / den) * 100) : 0);
  const funnel = [
    { label: "응모", value: applied, rate: null as number | null },
    { label: "선정", value: selected, rate: pct(selected, applied) },
    { label: "콘텐츠 제출", value: submitted, rate: pct(submitted, selected) },
    { label: "승인·지급", value: approved, rate: pct(approved, submitted) },
  ];
  const maxFunnel = Math.max(1, ...funnel.map((f) => f.value));

  const fmt = (n: number) =>
    n >= 10000 ? `${(n / 10000).toFixed(1).replace(/\.0$/, "")}만` : n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}천` : n.toLocaleString();

  return (
    <section className="mt-10 rounded-3xl glass-card p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-accent-soft">
            <BarChart3 className="size-5 text-accent-ink" />
          </div>
          <div>
            <h3 className="text-lg font-semibold tracking-tight">캠페인 성과</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">응모부터 포인트 지급까지 한눈에</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {status === "open" && (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                daysLeft <= 3 ? "bg-warning-soft text-warning" : "bg-muted text-muted-foreground"
              }`}
            >
              <Timer className="size-3.5" />
              {daysLeft > 0 ? `모집 마감 D-${daysLeft}` : "모집 마감"}
            </span>
          )}
          {["open", "closed", "completed"].includes(status) && (
            <ReportShareButton campaignId={campaignId} initialToken={reportToken} siteUrl={siteUrl} initialSummary={reportSummary} initialSummaryAt={reportSummaryAt} />
          )}
        </div>
      </div>

      {reportSummary && (
        <div className="mt-5 rounded-2xl border border-accent/20 bg-accent-soft/30 px-4 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-accent-ink">AI 요약</div>
          <div className="mt-1 text-sm font-semibold">{reportSummary.headline}</div>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{reportSummary.summary}</p>
        </div>
      )}

      {/* 핵심 지표 4종 */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl bg-muted/50 px-4 py-3">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">모집 진행률</div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="display text-2xl font-semibold">{fillRate}%</span>
            <span className="text-xs text-muted-foreground">{selected}/{recruitCount}명</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-background">
            <div className="h-full rounded-full bg-accent" style={{ width: `${fillRate}%` }} />
          </div>
        </div>
        <div className="rounded-2xl bg-muted/50 px-4 py-3">
          <div className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-muted-foreground">
            <Users className="size-3" /> 응모 경쟁률
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="display text-2xl font-semibold">
              {recruitCount > 0 ? (applied / recruitCount).toFixed(1) : "0"}:1
            </span>
            <span className="text-xs text-muted-foreground">{applied}명 응모</span>
          </div>
        </div>
        <div className="rounded-2xl bg-muted/50 px-4 py-3">
          <div className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-muted-foreground">
            <Radio className="size-3" /> 예상 도달
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="display text-2xl font-semibold">{fmt(totalReach)}</span>
            <span className="text-xs text-muted-foreground">선정 크리에이터 팔로워 합</span>
          </div>
        </div>
        <div className="rounded-2xl bg-muted/50 px-4 py-3">
          <div className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-muted-foreground">
            <Coins className="size-3" /> 지급 포인트
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="display text-2xl font-semibold">{pointsPaid.toLocaleString()}</span>
            <span className="text-xs text-muted-foreground">P · {approved}건 승인</span>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* 퍼널 */}
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">진행 퍼널</div>
          <ul className="mt-3 space-y-2.5">
            {funnel.map((f) => (
              <li key={f.label}>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-medium">{f.label}</span>
                  <span className="text-muted-foreground">
                    <span className="font-semibold text-foreground">{f.value}</span>
                    {f.rate !== null && <span className="ml-1.5 text-xs">({f.rate}%)</span>}
                  </span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-accent/80"
                    style={{ width: `${Math.max(2, (f.value / maxFunnel) * 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
          {applied === 0 && (
            <p className="mt-3 text-xs text-muted-foreground">
              아직 응모자가 없어요. AI 매칭으로 추천 크리에이터를 찾아 초대해보세요.
            </p>
          )}
        </div>

        {/* 채널별 도달 */}
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">채널별 도달</div>
          {reachRows.length === 0 ? (
            <p className="mt-3 text-xs text-muted-foreground">크리에이터를 선정하면 채널별 팔로워 합이 표시돼요.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {reachRows.map(([name, n]) => (
                <li key={name} className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2 text-sm">
                  <span>{name}</span>
                  <span className="font-semibold">{fmt(n)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
