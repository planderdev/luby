import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  ExternalLink,
  MapPin,
  Users,
} from "lucide-react";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "크리에이터 프로필 — 루비AI" };

type Portfolio = {
  id: string;
  name: string;
  avatar_url: string | null;
  joined_at: string;
  bio: string | null;
  region_name: string | null;
  region_flag: string | null;
  categories: { name: string; emoji: string | null }[];
  channels: {
    type_name: string;
    type_slug: string;
    handle: string;
    url: string;
    followers: number;
    verified: boolean;
  }[];
  stats: { applied: number; selected: number; completed: number };
  recent_collabs: {
    title: string;
    business_name: string;
    category_name: string | null;
    category_emoji: string | null;
    completed_at: string;
  }[];
};

function fmtFollowers(n: number) {
  if (n >= 10000) return `${(n / 10000).toFixed(1).replace(/\.0$/, "")}만`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}천`;
  return n.toLocaleString();
}

export default async function CreatorProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const viewer = await getCurrentProfile();
  if (!viewer) redirect("/login?redirect=/dashboard");

  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_creator_portfolio", { p_profile_id: id });
  // 공개 프로필을 켠 크리에이터면 공유 가능한 /p/[id] 링크 표시 (RLS: 승인 크리에이터의 influencers 행은 조회 가능)
  const { data: pubRow } = await supabase.from("influencers").select("public_profile").eq("profile_id", id).maybeSingle();
  const hasPublic = !!pubRow?.public_profile;
  // 데모 계정(@ruby-ai.kr)의 채널은 실제로 존재하지 않는 주소다(핸들에 한글이 섞여 있어 플랫폼이 오류를 낸다).
  // 링크로 만들지 않고 텍스트로만 보여준다.
  const { data: demo } = await supabase.rpc("is_demo_account", { p_profile: id });
  const isDemo = demo === true;
  const portfolio = data as Portfolio | null;

  if (!portfolio) {
    return (
      <div className="rounded-3xl border border-dashed border-border bg-background p-10 text-center">
        <p className="text-sm text-muted-foreground">
          프로필을 찾을 수 없습니다. 승인된 크리에이터만 프로필이 공개돼요.
        </p>
        <Link
          href="/dashboard"
          className="mt-5 inline-flex rounded-full border border-border bg-background px-5 py-2.5 text-sm font-medium hover:bg-muted"
        >
          대시보드로 돌아가기
        </Link>
      </div>
    );
  }

  const totalFollowers = portfolio.channels.reduce((sum, c) => sum + (c.followers ?? 0), 0);
  const selectionRate =
    portfolio.stats.applied > 0
      ? Math.round((portfolio.stats.selected / portfolio.stats.applied) * 100)
      : null;

  return (
    <div>
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> 대시보드
      </Link>

      {/* 프로필 헤더 */}
      <div className="mt-4 rounded-3xl glass-card p-6 lg:p-8">
        <div className="flex flex-wrap items-start gap-5">
          {portfolio.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={portfolio.avatar_url}
              alt={portfolio.name}
              className="size-20 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="flex size-20 shrink-0 items-center justify-center rounded-full bg-foreground text-background text-2xl font-semibold">
              {portfolio.name.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="display text-3xl font-semibold">{portfolio.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {portfolio.region_name && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3.5" />
                  {portfolio.region_flag} {portfolio.region_name}
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="size-3.5" />
                {new Date(portfolio.joined_at).toLocaleDateString("ko-KR")} 가입
              </span>
              {hasPublic && (
                <a href={`/p/${id}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-foreground">
                  공개 프로필 링크 ↗
                </a>
              )}
              {totalFollowers > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Users className="size-3.5" />총 팔로워 {fmtFollowers(totalFollowers)}
                </span>
              )}
            </div>
            {portfolio.bio && (
              <p className="mt-3 max-w-2xl text-sm text-muted-foreground">{portfolio.bio}</p>
            )}
            {(portfolio.categories ?? []).length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {portfolio.categories.map((c, i) => (
                  <span
                    key={i}
                    className="rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-medium text-accent-ink"
                  >
                    {c.emoji} {c.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 활동 통계 */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "응모", value: portfolio.stats.applied.toLocaleString() },
            { label: "선정", value: portfolio.stats.selected.toLocaleString() },
            { label: "체험 완료", value: portfolio.stats.completed.toLocaleString() },
            { label: "선정률", value: selectionRate === null ? "—" : `${selectionRate}%` },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl bg-muted/50 px-4 py-3 text-center">
              <div className="display text-xl font-semibold">{s.value}</div>
              <div className="mt-0.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 채널 */}
      <h2 className="mt-10 text-lg font-semibold tracking-tight">운영 채널</h2>
      <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {portfolio.channels.map((c, i) => {
          const body = (
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                {c.type_name}
                {c.verified && <BadgeCheck className="size-3.5 text-accent-ink" />}
              </div>
              <div className="mt-1 truncate text-sm font-medium">{c.handle}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                팔로워 {fmtFollowers(c.followers ?? 0)}
              </div>
            </div>
          );
          if (isDemo) {
            return (
              <div key={i} className="flex items-center justify-between gap-3 rounded-2xl glass-card px-5 py-4">
                {body}
                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">데모</span>
              </div>
            );
          }
          return (
            <a
              key={i}
              href={c.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-between gap-3 rounded-2xl glass-card px-5 py-4 transition-colors hover:bg-muted/40"
            >
              {body}
              <ExternalLink className="size-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
            </a>
          );
        })}
        {portfolio.channels.length === 0 && (
          <p className="col-span-full rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            등록된 채널이 없습니다.
          </p>
        )}
      </div>

      {/* 최근 완료 캠페인 */}
      <h2 className="mt-10 text-lg font-semibold tracking-tight">최근 체험 이력</h2>
      <div className="mt-3 space-y-2">
        {portfolio.recent_collabs.map((c, i) => (
          <div
            key={i}
            className="flex flex-wrap items-center justify-between gap-2 rounded-2xl glass-card px-5 py-3.5"
          >
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">
                {c.category_emoji} {c.title}
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {c.business_name}
                {c.category_name && ` · ${c.category_name}`}
              </div>
            </div>
            <span className="shrink-0 text-[11px] text-muted-foreground">
              {new Date(c.completed_at).toLocaleDateString("ko-KR")} 완료
            </span>
          </div>
        ))}
        {portfolio.recent_collabs.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            아직 완료한 체험이 없어요.
          </p>
        )}
      </div>
    </div>
  );
}
