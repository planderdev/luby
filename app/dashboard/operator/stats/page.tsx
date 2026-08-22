import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Users,
  Megaphone,
  Inbox,
  UserCheck,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "통계 — 루비AI" };

const CAMPAIGN_STATUS_LABEL: Record<string, string> = {
  draft: "초안",
  pending_approval: "검수 대기",
  open: "모집중",
  closed: "마감",
  completed: "완료",
  cancelled: "취소",
};

const APPLICATION_STATUS_LABEL: Record<string, string> = {
  pending: "응모 대기",
  selected: "선정",
  rejected: "미선정",
  cancelled: "취소",
  completed: "완료",
};

export default async function OperatorStatsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "operator") redirect("/dashboard");

  const supabase = await createClient();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [profilesRes, campaignsRes, applicationsRes, recentRes, channelsRes, weeklyRes, paidRes, wdRes] =
    await Promise.all([
      supabase.from("profiles").select("role, approved"),
      supabase.from("campaigns").select("status"),
      supabase.from("applications").select("status"),
      supabase.from("profiles").select("id").gte("created_at", weekAgo),
      supabase.from("influencer_channels").select("id"),
      supabase.rpc("operator_weekly_stats", { p_weeks: 8 }),
      supabase.from("payments").select("amount").eq("status", "paid"),
      supabase.from("point_withdrawals").select("amount, status").in("status", ["paid", "requested"]),
    ]);
  const weekly = weeklyRes.data ?? [];
  const revenue = (paidRes.data ?? []).reduce((s, p) => s + (p.amount ?? 0), 0);
  const withdrawals = wdRes.data ?? [];
  const paidOut = withdrawals.filter((w) => w.status === "paid").reduce((s, w) => s + (w.amount ?? 0), 0);
  const pendingOut = withdrawals.filter((w) => w.status === "requested").reduce((s, w) => s + (w.amount ?? 0), 0);
  const { count: referredTotal } = await supabase.from("profiles").select("id", { count: "exact", head: true }).not("referred_by", "is", null);
  const { data: featRaw } = await supabase.rpc("operator_feature_stats");
  const feat = (featRaw ?? null) as null | Record<string, number | string>;
  const n = (k: string) => Number(feat?.[k] ?? 0);

  const allProfiles = profilesRes.data ?? [];
  const advertisers = allProfiles.filter((p) => p.role === "advertiser");
  const influencers = allProfiles.filter((p) => p.role === "influencer");
  const pendingApprovals = allProfiles.filter((p) => !p.approved);

  const campaigns = campaignsRes.data ?? [];
  const campaignsByStatus = countBy(campaigns.map((c) => c.status));

  const applications = applicationsRes.data ?? [];
  const applicationsByStatus = countBy(applications.map((a) => a.status));

  return (
    <div>
      <h1 className="display text-3xl font-semibold lg:text-4xl">통계</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        플랫폼 전체 현황을 한눈에 확인합니다.
      </p>

      {/* Top-line stats */}
      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Users className="size-4" />}
          label="전체 회원"
          value={allProfiles.length}
          sub={`광고주 ${advertisers.length} · 인플루언서 ${influencers.length}`}
        />
        <StatCard
          icon={<Megaphone className="size-4" />}
          label="전체 캠페인"
          value={campaigns.length}
          sub={`모집중 ${campaignsByStatus.open ?? 0}건`}
        />
        <StatCard
          icon={<Inbox className="size-4" />}
          label="전체 응모"
          value={applications.length}
          sub={`선정 ${applicationsByStatus.selected ?? 0}건`}
        />
        <StatCard
          icon={<TrendingUp className="size-4" />}
          label="최근 7일 가입"
          value={(recentRes.data ?? []).length}
          sub={`등록 채널 ${(channelsRes.data ?? []).length}개`}
        />
      </div>

      {/* Action needed */}
      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <Link
          href="/dashboard/operator/users"
          className="group flex items-center justify-between rounded-3xl glass-card p-6 transition-colors hover:bg-muted/40"
        >
          <div className="flex items-center gap-4">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-accent-soft text-accent-ink">
              <UserCheck className="size-5" strokeWidth={1.8} />
            </div>
            <div>
              <div className="text-sm font-semibold">회원 승인 대기</div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                검토가 필요한 가입 요청
              </div>
            </div>
          </div>
          <span
            className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ${
              pendingApprovals.length > 0
                ? "bg-accent text-background"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {pendingApprovals.length}
          </span>
        </Link>

        <Link
          href="/dashboard/operator/campaigns"
          className="group flex items-center justify-between rounded-3xl glass-card p-6 transition-colors hover:bg-muted/40"
        >
          <div className="flex items-center gap-4">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-accent-soft text-accent-ink">
              <ShieldCheck className="size-5" strokeWidth={1.8} />
            </div>
            <div>
              <div className="text-sm font-semibold">캠페인 검수 대기</div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                승인/반려가 필요한 캠페인
              </div>
            </div>
          </div>
          <span
            className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ${
              (campaignsByStatus.pending_approval ?? 0) > 0
                ? "bg-accent text-background"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {campaignsByStatus.pending_approval ?? 0}
          </span>
        </Link>
      </div>

      {/* 재무 요약 */}
      <div className="mt-8 grid gap-4 md:grid-cols-4">
        <MoneyCard label="추천 유입 누계" value={`${(referredTotal ?? 0).toLocaleString()}명`} hint="공유 링크(?ref) 로 가입" />
        <MoneyCard label="누적 결제 매출" value={`₩${revenue.toLocaleString()}`} hint="BUSINESS 결제 완료 합계" />
        <MoneyCard label="누적 포인트 지급" value={`${paidOut.toLocaleString()}P`} hint="정산 완료 합계" />
        <MoneyCard
          label="정산 대기 금액"
          value={`${pendingOut.toLocaleString()}P`}
          hint={pendingOut > 0 ? "처리가 필요해요" : "대기 없음"}
          warn={pendingOut > 0}
        />
      </div>

      {/* 주간 추이 */}
      <h2 className="mt-12 text-lg font-semibold tracking-tight">최근 8주 추이</h2>
      <p className="mt-1 text-xs text-muted-foreground">주 단위(월요일 시작) 집계 · 이번 주는 진행 중</p>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <TrendCard
          title="신규 가입"
          series={[
            { label: "크리에이터", values: weekly.map((w) => Number(w.new_influencers)), tone: "accent" },
            { label: "광고주", values: weekly.map((w) => Number(w.new_advertisers)), tone: "muted" },
          ]}
          weeks={weekly.map((w) => w.week_start)}
        />
        <TrendCard
          title="캠페인 승인 · 응모"
          series={[
            { label: "응모", values: weekly.map((w) => Number(w.applications)), tone: "accent" },
            { label: "캠페인 승인", values: weekly.map((w) => Number(w.campaigns_opened)), tone: "muted" },
          ]}
          weeks={weekly.map((w) => w.week_start)}
        />
        <TrendCard
          title="콘텐츠 승인 · 포인트 지급"
          series={[
            { label: "콘텐츠 승인(건)", values: weekly.map((w) => Number(w.submissions_approved)), tone: "accent" },
            { label: "포인트 지급(만P)", values: weekly.map((w) => Math.round(Number(w.points_paid) / 10000)), tone: "muted" },
          ]}
          weeks={weekly.map((w) => w.week_start)}
        />
        <TrendCard
          title="결제 매출 (만원)"
          series={[
            { label: "결제", values: weekly.map((w) => Math.round(Number(w.payments_krw) / 10000)), tone: "accent" },
          ]}
          weeks={weekly.map((w) => w.week_start)}
        />
        <TrendCard
          title="추천 유입 가입 (바이럴)"
          series={[
            { label: "추천 가입", values: weekly.map((w) => Number(w.referred_signups ?? 0)), tone: "accent" },
            { label: "전체 가입", values: weekly.map((w) => Number(w.new_influencers) + Number(w.new_advertisers)), tone: "muted" },
          ]}
          weeks={weekly.map((w) => w.week_start)}
        />
      </div>

      {/* 신기능 채택 지표 */}
      {feat && (
        <section className="mt-8 rounded-3xl glass-card p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">기능 채택 · AI</h2>
            <Link href="/dashboard/operator/ai-usage" className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground">AI 사용량 상세 →</Link>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            {[
              { l: "공개 프로필 옵트인", v: `${n("public_profiles")}명`, s: `승인 크리에이터 ${n("approved_creators")}명 중 (데모 제외) · 디렉터리 판단 근거` },
              { l: "리포트 공유 켠 캠페인", v: `${n("report_shares")}개`, s: "클라이언트 보고 링크 활성" },
              { l: "AI 요약 생성", v: `${n("ai_summaries")}개`, s: `완료 캠페인 ${n("completed_campaigns")}개 (완료 시 자동)` },
              { l: "AI 적합도 평가", v: `${n("fit_scored_applicants")}명`, s: `${n("fit_scored_campaigns")}개 캠페인` },
              { l: "주간 다이제스트 (7일)", v: `${n("digests_7d")}통`, s: `수신 거부 ${n("digest_optouts")}명` },
              { l: "AI 호출 (7일)", v: `${n("ai_calls_7d")}회`, s: `추정 $${Number(feat.ai_cost_7d ?? 0).toFixed(2)} · 30일 $${Number(feat.ai_cost_30d ?? 0).toFixed(2)}` },
            ].map((k) => (
              <div key={k.l} className="rounded-2xl bg-muted/50 px-4 py-3">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{k.l}</div>
                <div className="display mt-1 text-xl font-semibold tabular-nums">{k.v}</div>
                <div className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{k.s}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Status breakdowns */}
      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <BreakdownCard
          title="캠페인 상태별"
          rows={Object.entries(CAMPAIGN_STATUS_LABEL).map(([key, label]) => ({
            label,
            count: campaignsByStatus[key] ?? 0,
          }))}
          total={campaigns.length}
        />
        <BreakdownCard
          title="응모 상태별"
          rows={Object.entries(APPLICATION_STATUS_LABEL).map(([key, label]) => ({
            label,
            count: applicationsByStatus[key] ?? 0,
          }))}
          total={applications.length}
        />
      </div>
    </div>
  );
}

function countBy(items: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const item of items) out[item] = (out[item] ?? 0) + 1;
  return out;
}

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  sub: string;
}) {
  return (
    <div className="rounded-3xl glass-card p-6">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="display mt-3 text-3xl font-semibold">{value.toLocaleString()}</div>
      <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}

function BreakdownCard({
  title,
  rows,
  total,
}: {
  title: string;
  rows: { label: string; count: number }[];
  total: number;
}) {
  return (
    <div className="rounded-3xl glass-card p-6">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      <div className="mt-4 space-y-3">
        {rows.map((row) => {
          const pct = total > 0 ? Math.round((row.count / total) * 100) : 0;
          return (
            <div key={row.label}>
              <div className="flex items-center justify-between text-sm">
                <span>{row.label}</span>
                <span className="tabular-nums text-muted-foreground">
                  {row.count}
                  <span className="ml-1.5 text-xs">({pct}%)</span>
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-accent transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TrendCard({
  title,
  series,
  weeks,
}: {
  title: string;
  series: { label: string; values: number[]; tone: "accent" | "muted" }[];
  weeks: string[];
}) {
  const max = Math.max(1, ...series.flatMap((s) => s.values));
  const fmtWeek = (iso: string) => {
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };
  return (
    <div className="rounded-3xl glass-card p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        <div className="flex gap-3 text-[11px] text-muted-foreground">
          {series.map((s) => (
            <span key={s.label} className="inline-flex items-center gap-1">
              <span className={`inline-block size-2 rounded-sm ${s.tone === "accent" ? "bg-accent" : "bg-foreground/35"}`} />
              {s.label}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-4 flex h-32 items-end gap-2">
        {weeks.map((w, i) => (
          <div key={w} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex h-24 w-full items-end justify-center gap-0.5">
              {series.map((s) => {
                const v = s.values[i] ?? 0;
                const h = Math.max(v > 0 ? 3 : 0, (v / max) * 100);
                return (
                  <div
                    key={s.label}
                    title={`${s.label}: ${v.toLocaleString()}`}
                    className={`w-full max-w-[14px] rounded-t-sm transition-all ${
                      s.tone === "accent" ? "bg-accent" : "bg-foreground/35"
                    }`}
                    style={{ height: `${h}%` }}
                  />
                );
              })}
            </div>
            <span className="text-[10px] text-muted-foreground">{fmtWeek(w)}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
        <span>최근 8주</span>
        <span>
          이번 주:{" "}
          {series.map((s) => `${s.label} ${(s.values[s.values.length - 1] ?? 0).toLocaleString()}`).join(" · ")}
        </span>
      </div>
    </div>
  );
}

function MoneyCard({ label, value, hint, warn }: { label: string; value: string; hint: string; warn?: boolean }) {
  return (
    <div className="rounded-3xl glass-card p-6">
      <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className="display mt-4 text-2xl font-semibold">{value}</div>
      <div className={`mt-1 text-xs ${warn ? "text-warning" : "text-muted-foreground"}`}>{hint}</div>
    </div>
  );
}
