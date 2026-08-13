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

  const [profilesRes, campaignsRes, applicationsRes, recentRes, channelsRes] =
    await Promise.all([
      supabase.from("profiles").select("role, approved"),
      supabase.from("campaigns").select("status"),
      supabase.from("applications").select("status"),
      supabase.from("profiles").select("id").gte("created_at", weekAgo),
      supabase.from("influencer_channels").select("id"),
    ]);

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
