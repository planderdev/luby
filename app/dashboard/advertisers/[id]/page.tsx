import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  Coins,
  ExternalLink,
  Globe,
  Users,
} from "lucide-react";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "광고주 프로필 — 루비AI" };

type Portfolio = {
  id: string;
  company_name: string;
  avatar_url: string | null;
  joined_at: string;
  description: string | null;
  website: string | null;
  category_name: string | null;
  category_emoji: string | null;
  stats: {
    campaigns_total: number;
    campaigns_open: number;
    campaigns_completed: number;
    creators_selected: number;
    creators_completed: number;
  };
  open_campaigns: {
    id: string;
    title: string;
    thumbnail_url: string | null;
    point_amount: number;
    recruit_end: string;
    recruit_count: number;
  }[];
  past_campaigns: { id: string; title: string; status: string; completed_at: string }[];
};

function safeUrl(u: string | null) {
  if (!u) return null;
  const withProto = /^https?:\/\//i.test(u) ? u : `https://${u}`;
  try {
    const parsed = new URL(withProto);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

export default async function AdvertiserProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const viewer = await getCurrentProfile();
  if (!viewer) redirect("/login?redirect=/dashboard");

  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_advertiser_portfolio", { p_profile_id: id });
  const p = data as Portfolio | null;

  if (!p) {
    return (
      <div className="rounded-3xl border border-dashed border-border bg-background p-10 text-center">
        <p className="text-sm text-muted-foreground">광고주 프로필을 찾을 수 없습니다.</p>
        <Link
          href="/dashboard"
          className="mt-5 inline-flex rounded-full border border-border bg-background px-5 py-2.5 text-sm font-medium hover:bg-muted"
        >
          대시보드로 돌아가기
        </Link>
      </div>
    );
  }

  const website = safeUrl(p.website);
  const isSelf = viewer.id === p.id;

  return (
    <div>
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> 대시보드
      </Link>

      {/* 헤더 */}
      <div className="mt-4 rounded-3xl glass-card p-6 lg:p-8">
        <div className="flex flex-wrap items-start gap-5">
          {p.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.avatar_url} alt={p.company_name} className="size-20 shrink-0 rounded-2xl object-cover" />
          ) : (
            <div className="flex size-20 shrink-0 items-center justify-center rounded-2xl bg-foreground text-background">
              <Building2 className="size-8" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="display text-3xl font-semibold">{p.company_name}</h1>
              {p.category_name && (
                <span className="rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-medium text-accent-ink">
                  {p.category_emoji} {p.category_name}
                </span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="size-3.5" />
                {new Date(p.joined_at).toLocaleDateString("ko-KR")} 가입
              </span>
              {website && (
                <a
                  href={website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 hover:text-foreground"
                >
                  <Globe className="size-3.5" />
                  {website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                  <ExternalLink className="size-3" />
                </a>
              )}
            </div>
            {p.description ? (
              <p className="mt-3 max-w-2xl whitespace-pre-wrap text-sm text-muted-foreground">{p.description}</p>
            ) : isSelf ? (
              <p className="mt-3 text-sm text-muted-foreground">
                회사 소개가 비어 있어요.{" "}
                <Link href="/dashboard/settings" className="underline underline-offset-2 hover:text-foreground">
                  설정에서 소개·웹사이트·업종을 채우면
                </Link>{" "}
                크리에이터의 초대 수락률이 올라갑니다.
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "진행 캠페인", value: p.stats.campaigns_total },
            { label: "모집중", value: p.stats.campaigns_open },
            { label: "선정한 크리에이터", value: p.stats.creators_selected },
            { label: "완료된 체험", value: p.stats.creators_completed },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl bg-muted/50 px-4 py-3 text-center">
              <div className="display text-xl font-semibold">{s.value.toLocaleString()}</div>
              <div className="mt-0.5 text-[11px] uppercase tracking-wider text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 모집중 캠페인 */}
      <h2 className="mt-10 text-lg font-semibold tracking-tight">모집중인 캠페인</h2>
      <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {p.open_campaigns.map((c) => (
          <Link
            key={c.id}
            href={`/dashboard/campaigns/${c.id}`}
            className="group flex flex-col overflow-hidden rounded-2xl glass-card transition-colors hover:bg-muted/40"
          >
            <div className="relative aspect-[16/9] w-full bg-muted">
              {c.thumbnail_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.thumbnail_url} alt={c.title} className="size-full object-cover" />
              ) : (
                <div className="flex size-full items-center justify-center text-3xl opacity-40">
                  {p.category_emoji ?? "🎯"}
                </div>
              )}
            </div>
            <div className="p-4">
              <h3 className="line-clamp-2 text-sm font-semibold group-hover:underline underline-offset-2">{c.title}</h3>
              <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Users className="size-3.5" />
                  {c.recruit_count}명
                </span>
                <span>~{new Date(c.recruit_end).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })}</span>
                {c.point_amount > 0 && (
                  <span className="ml-auto inline-flex items-center gap-1 font-semibold text-accent-ink">
                    <Coins className="size-3.5" />
                    {c.point_amount.toLocaleString()}P
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
        {p.open_campaigns.length === 0 && (
          <p className="col-span-full rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            지금 모집중인 캠페인이 없어요.
          </p>
        )}
      </div>

      {/* 지난 캠페인 */}
      {p.past_campaigns.length > 0 && (
        <>
          <h2 className="mt-10 text-lg font-semibold tracking-tight">지난 캠페인</h2>
          <div className="mt-3 space-y-2">
            {p.past_campaigns.map((c) => (
              <Link
                key={c.id}
                href={`/dashboard/campaigns/${c.id}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl glass-card px-5 py-3.5 transition-colors hover:bg-muted/40"
              >
                <span className="truncate text-sm font-medium">{c.title}</span>
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {c.status === "completed" ? "완료" : "마감"} · {new Date(c.completed_at).toLocaleDateString("ko-KR")}
                </span>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
