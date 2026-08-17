import { redirect } from "next/navigation";
import Link from "next/link";
import { BadgeCheck, ChevronLeft, ChevronRight, Sparkles, Users } from "lucide-react";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { fetchUICatalog } from "@/lib/cache/ui-catalog";
import { getEntitlements } from "@/lib/plans/entitlements";
import { CreatorFilters } from "./CreatorFilters";
import { InviteButton } from "./InviteButton";

export const metadata = { title: "크리에이터 찾기 — 루비AI" };

const PAGE_SIZE = 24;

function fmtFollowers(n: number) {
  if (n >= 10000) return `${(n / 10000).toFixed(1).replace(/\.0$/, "")}만`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}천`;
  return n.toLocaleString();
}

export default async function CreatorsDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    category?: string;
    region?: string;
    channel?: string;
    followers?: string;
    sort?: string;
    page?: string;
    public?: string;
  }>;
}) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login?redirect=/dashboard/creators");
  if (profile.role !== "advertiser" && profile.role !== "operator") redirect("/dashboard");

  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const sort = ["followers", "completed", "recent"].includes(sp.sort ?? "")
    ? sp.sort!
    : "followers";
  const minFollowers = sp.followers ? parseInt(sp.followers, 10) || null : null;

  const supabase = await createClient();
  const [{ data: rows }, catalog, ent] = await Promise.all([
    supabase.rpc("search_creators", {
      p_query: sp.q?.trim() || null,
      p_category_id: sp.category || null,
      p_region_id: sp.region || null,
      p_channel_type_id: sp.channel || null,
      p_min_followers: minFollowers,
      p_sort: sort,
      p_limit: PAGE_SIZE,
      p_offset: (page - 1) * PAGE_SIZE,
      p_public: sp.public === "1" ? true : null,
    }),
    fetchUICatalog(),
    profile.role === "advertiser" ? getEntitlements(profile.id) : Promise.resolve(null),
  ]);

  const creators = rows ?? [];
  const total = Number(creators[0]?.total_count ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // 광고주: 초대 가능한 본인 모집중 캠페인 + 이미 보낸 초대
  let inviteCampaigns: { id: string; title: string }[] = [];
  const invitedByCreator = new Map<string, string[]>();
  const canInvite = ent?.aiMatching ?? false;
  if (profile.role === "advertiser") {
    const { data: openCampaigns } = await supabase
      .from("campaigns")
      .select("id, title")
      .eq("advertiser_id", profile.id)
      .eq("status", "open")
      .order("created_at", { ascending: false });
    inviteCampaigns = openCampaigns ?? [];
    if (inviteCampaigns.length && creators.length) {
      const { data: invs } = await supabase
        .from("campaign_invitations")
        .select("campaign_id, influencer_id")
        .eq("invited_by", profile.id)
        .in(
          "influencer_id",
          creators.map((c) => c.id)
        );
      for (const inv of invs ?? []) {
        const arr = invitedByCreator.get(inv.influencer_id) ?? [];
        arr.push(inv.campaign_id);
        invitedByCreator.set(inv.influencer_id, arr);
      }
    }
  }

  const buildHref = (p: number) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (v && k !== "page") next.set(k, v);
    if (p > 1) next.set("page", String(p));
    const qs = next.toString();
    return qs ? `/dashboard/creators?${qs}` : "/dashboard/creators";
  };

  return (
    <div>
      <header>
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">크리에이터 찾기</p>
        <h1 className="display mt-2 text-3xl font-semibold lg:text-4xl">글로벌 크리에이터 풀</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          업종·지역·채널로 골라 프로필을 확인하고, 마음에 드는 크리에이터를 캠페인에 바로 초대하세요.
        </p>
      </header>

      {profile.role === "advertiser" && !canInvite && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent/30 bg-accent-soft/50 px-5 py-4 text-sm">
          <span className="inline-flex items-center gap-2 text-accent-ink">
            <Sparkles className="size-4 shrink-0" />
            프로필 열람은 자유지만, 캠페인 <strong>초대</strong>는 BUSINESS 플랜 혜택이에요.
          </span>
          <Link href="/dashboard/billing" className="btn-neon shrink-0 rounded-full px-4 py-2 text-xs font-bold">
            플랜 보기
          </Link>
        </div>
      )}
      {profile.role === "advertiser" && canInvite && inviteCampaigns.length === 0 && (
        <div className="mt-6 rounded-2xl border border-border bg-muted/40 px-5 py-4 text-sm text-muted-foreground">
          모집중인 캠페인이 없어 초대 버튼이 숨겨져 있어요. 캠페인이 승인되면 여기서 바로 초대할 수 있습니다.
        </div>
      )}

      <CreatorFilters
        categories={catalog.categories.map((c) => ({ value: c.id, label: `${c.emoji ?? ""} ${c.name}`.trim() }))}
        regions={catalog.regions.map((r) => ({ value: r.id, label: `${r.flag} ${r.name}`.trim() }))}
        channels={catalog.channels.map((c) => ({ value: c.id, label: c.name }))}
        quickChannels={catalog.channels
          .filter((c) => ["xiaohongshu", "douyin", "lemon8"].includes(c.slug))
          .map((c) => ({ value: c.id, label: c.name.replace(/\s*\(.*\)$/, "") }))}
      />

      <p className="mt-6 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Users className="size-3.5" /> 총 {total.toLocaleString()}명
        {totalPages > 1 && ` · ${page}/${totalPages} 페이지`}
      </p>

      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {creators.map((c) => {
          const channels = (c.channels as { type: string; slug: string; followers: number }[]) ?? [];
          const cats = (c.categories as { name: string; emoji: string | null }[]) ?? [];
          return (
            <div key={c.id} className="flex flex-col rounded-2xl glass-card p-5">
              <Link href={`/dashboard/creators/${c.id}`} className="group flex items-start gap-3">
                {c.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.avatar_url} alt={c.name} className="size-12 shrink-0 rounded-full object-cover" />
                ) : (
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-foreground text-background text-base font-semibold">
                    {c.name.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-semibold group-hover:underline underline-offset-2">
                      {c.name}
                    </span>
                    {Number(c.completed_count) > 0 && (
                      <BadgeCheck className="size-3.5 shrink-0 text-accent-ink" aria-label="체험 완료 이력" />
                    )}
                    {c.public_profile && (
                      <span className="shrink-0 rounded-full border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground" title="공개 프로필 있음 — 링크 공유 가능">공개</span>
                    )}
                  </div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    {c.region_flag} {c.region_name} · 팔로워 {fmtFollowers(Number(c.total_followers))}
                    {Number(c.completed_count) > 0 && ` · 완료 ${c.completed_count}`}
                  </div>
                  {c.bio && (
                    <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{c.bio}</p>
                  )}
                </div>
              </Link>

              <div className="mt-3 flex flex-wrap gap-1">
                {cats.map((cat, i) => (
                  <span key={i} className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-medium text-accent-ink">
                    {cat.emoji} {cat.name}
                  </span>
                ))}
                {channels.slice(0, 3).map((ch, i) => (
                  <span key={i} className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                    {ch.type} {fmtFollowers(ch.followers ?? 0)}
                  </span>
                ))}
              </div>

              {profile.role === "advertiser" && canInvite && inviteCampaigns.length > 0 && (
                <div className="mt-3 flex justify-end">
                  <InviteButton
                    influencerId={c.id}
                    campaigns={inviteCampaigns}
                    alreadyInvited={invitedByCreator.get(c.id) ?? []}
                  />
                </div>
              )}
            </div>
          );
        })}
        {creators.length === 0 && (
          <div className="col-span-full rounded-3xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            조건에 맞는 크리에이터가 없습니다. 필터를 조정해보세요.
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          <Link
            href={buildHref(Math.max(1, page - 1))}
            aria-disabled={page <= 1}
            className={`inline-flex size-9 items-center justify-center rounded-full border border-border ${page <= 1 ? "pointer-events-none opacity-40" : "hover:bg-muted"}`}
          >
            <ChevronLeft className="size-4" />
          </Link>
          <span className="text-xs text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Link
            href={buildHref(Math.min(totalPages, page + 1))}
            aria-disabled={page >= totalPages}
            className={`inline-flex size-9 items-center justify-center rounded-full border border-border ${page >= totalPages ? "pointer-events-none opacity-40" : "hover:bg-muted"}`}
          >
            <ChevronRight className="size-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
