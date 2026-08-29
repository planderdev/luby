import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { MemberRow } from "./MemberRow";
import { BulkApproveList } from "./BulkApproveList";
import { InviteMemberPanel } from "./InviteMemberPanel";
import { BulkImportPanel } from "./BulkImportPanel";
import { BulkInvitePanel } from "./BulkInvitePanel";

export const metadata = { title: "회원 관리 — 루비AI" };

type Filter = "pending" | "never" | "all" | "advertiser" | "agency" | "influencer";

const TABS: { key: Filter; label: string }[] = [
  { key: "pending", label: "승인 대기" },
  { key: "never", label: "미로그인" },
  { key: "all", label: "전체" },
  { key: "advertiser", label: "광고주" },
  { key: "agency", label: "대행사" },
  { key: "influencer", label: "인플루언서" },
];

export default async function OperatorUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string; tag?: string }>;
}) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "operator") redirect("/dashboard");

  const params = await searchParams;
  const filter: Filter = (TABS.find((t) => t.key === params.filter)?.key ?? "pending") as Filter;
  const q = (params.q ?? "").trim().toLowerCase();
  const tag = (params.tag ?? "").trim();

  const supabase = await createClient();

  // 전체 회원 + 역할별 상세를 병렬 로드 (운영자 RLS로 전부 열람 가능)
  const [profilesRes, advertisersRes, influencersRes, channelsRes, regionsRes, channelTypesRes, categoriesRes] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, email, name, phone, role, approved, created_at, operator_tags")
        .order("created_at", { ascending: false }),
      supabase
        .from("advertisers")
        .select("profile_id, company_name, business_number, business_type, representative_name, advertiser_kind"),
      supabase.from("influencers").select("profile_id, region_id, bio, total_points"),
      supabase.from("influencer_channels").select("influencer_id, followers"),
      supabase.from("regions").select("id, flag, name"),
      supabase.from("channel_types").select("id, name").eq("active", true).order("sort_order"),
      supabase.from("categories").select("id, name, emoji").eq("active", true).order("sort_order"),
    ]);

  const advertiserById = new Map((advertisersRes.data ?? []).map((a) => [a.profile_id, a]));
  const influencerById = new Map((influencersRes.data ?? []).map((i) => [i.profile_id, i]));
  const regionById = new Map((regionsRes.data ?? []).map((r) => [r.id, r]));
  const channelAgg = new Map<string, { count: number; followers: number }>();
  for (const c of channelsRes.data ?? []) {
    const cur = channelAgg.get(c.influencer_id) ?? { count: 0, followers: 0 };
    cur.count += 1;
    cur.followers += c.followers ?? 0;
    channelAgg.set(c.influencer_id, cur);
  }

  const all = (profilesRes.data ?? []).filter((p) => p.role !== "operator");
  // 가입 후 한 번도 로그인하지 않은 계정 (일괄 등록 후 방치 파악)
  const { data: neverRows } = await supabase.rpc("operator_never_signed_in", { p_ids: all.map((p) => p.id) });
  // 데모 계정(@ruby-ai.kr)은 재초대 대상이 아니다 — 포함하면 400명이 넘어 숫자가 무의미해지고,
  // 일괄 재발송이 실존하지 않는 주소로 나가 발신 평판을 깎을 수 있다
  const demoIds = new Set(all.filter((p) => (p.email ?? "").endsWith("@ruby-ai.kr")).map((p) => p.id));
  const neverSignedIn = new Set(
    ((neverRows ?? []) as { id: string }[]).map((r) => r.id).filter((id) => !demoIds.has(id))
  );
  const isAgency = (id: string) => advertiserById.get(id)?.advertiser_kind === "agency";
  const counts: Record<Filter, number> = {
    pending: all.filter((p) => !p.approved).length,
    never: all.filter((p) => neverSignedIn.has(p.id)).length,
    all: all.length,
    advertiser: all.filter((p) => p.role === "advertiser" && !isAgency(p.id)).length,
    agency: all.filter((p) => p.role === "advertiser" && isAgency(p.id)).length,
    influencer: all.filter((p) => p.role === "influencer").length,
  };

  const matchesQuery = (p: (typeof all)[number]) => {
    if (!q) return true;
    const adv = advertiserById.get(p.id);
    const hay = [p.name, p.email, p.phone ?? "", adv?.company_name ?? "", adv?.business_number ?? ""].join(" ").toLowerCase();
    return hay.includes(q);
  };
  const matchesTag = (p: (typeof all)[number]) => !tag || (p.operator_tags ?? []).includes(tag);
  const allTags = [...new Set(all.flatMap((p) => p.operator_tags ?? []))].sort();
  const members = all.filter((p) => {
    if (!matchesQuery(p) || !matchesTag(p)) return false;
    if (filter === "pending") return !p.approved;
    if (filter === "never") return neverSignedIn.has(p.id);
    if (filter === "advertiser") return p.role === "advertiser" && !isAgency(p.id);
    if (filter === "agency") return p.role === "advertiser" && isAgency(p.id);
    if (filter === "influencer") return p.role === "influencer";
    return true;
  });
  const qs = (over: Record<string, string | undefined>) => {
    const u = new URLSearchParams();
    const merged = { filter, q: params.q ?? "", tag, ...over };
    if (merged.filter) u.set("filter", merged.filter);
    if (merged.q) u.set("q", merged.q);
    if (merged.tag) u.set("tag", merged.tag);
    return `/dashboard/operator/users?${u.toString()}`;
  };

  return (
    <div>
      <h1 className="display text-3xl font-semibold lg:text-4xl">회원 관리</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        가입 회원의 사업자 정보·채널 현황을 검수하고, 승인 상태를 관리합니다. 광고주·대행사·크리에이터를 직접 추가(초대)할 수도 있어요.
      </p>
      <InviteMemberPanel
        regions={(regionsRes.data ?? []).map((r) => ({ id: r.id, name: r.name, flag: r.flag }))}
        channelTypes={channelTypesRes.data ?? []}
        categories={categoriesRes.data ?? []}
      />
      <BulkImportPanel filter={filter} />

      {/* 검색 + 태그 필터 */}
      <form method="get" className="mt-8 flex flex-wrap items-center gap-2">
        <input type="hidden" name="filter" value={filter} />
        {tag && <input type="hidden" name="tag" value={tag} />}
        <input
          name="q"
          type="search"
          aria-label="회원 검색"
          defaultValue={params.q ?? ""}
          placeholder="이름·이메일·회사명·사업자번호 검색"
          className="min-w-[260px] flex-1 rounded-full border border-border bg-background px-4 py-2.5 text-sm outline-none"
        />
        <button type="submit" className="rounded-full border border-border bg-background px-4 py-2 text-sm hover:bg-muted">검색</button>
        {(q || tag) && <Link href={qs({ q: "", tag: "" })} className="text-xs text-muted-foreground hover:text-foreground">초기화</Link>}
      </form>
      {allTags.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">태그</span>
          {allTags.map((t) => (
            <Link key={t} href={qs({ tag: tag === t ? "" : t })} className={`rounded-full border px-2.5 py-1 text-xs ${tag === t ? "border-foreground bg-foreground text-background" : "border-border bg-background hover:bg-muted"}`}>{t}</Link>
          ))}
        </div>
      )}

      {/* Filter tabs */}
      <div className="mt-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={qs({ filter: t.key })}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
              filter === t.key
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-background text-muted-foreground hover:bg-muted"
            }`}
          >
            {t.label}
            <span
              className={`rounded-full px-1.5 text-xs tabular-nums ${
                filter === t.key ? "bg-background/20" : "bg-muted"
              }`}
            >
              {counts[t.key]}
            </span>
          </Link>
        ))}
      </div>

      {filter === "never" && members.length > 0 && (
        <BulkInvitePanel profileIds={members.map((p) => p.id)} names={members.slice(0, 3).map((p) => p.name)} />
      )}

      {(() => {
        const renderRow = (p: (typeof members)[number]) => {
          const adv = advertiserById.get(p.id);
          const inf = influencerById.get(p.id);
          const region = inf?.region_id ? regionById.get(inf.region_id) : null;
          const ch = channelAgg.get(p.id);
          return (
            <MemberRow
              key={p.id}
              profileId={p.id}
              name={p.name}
              email={p.email}
              phone={p.phone}
              role={p.role}
              approved={p.approved}
              createdAt={p.created_at}
              neverSignedIn={neverSignedIn.has(p.id)}
              tags={p.operator_tags ?? []}
              business={
                adv
                  ? {
                      companyName: adv.company_name,
                      advertiserKind: adv.advertiser_kind,
                      businessNumber: adv.business_number,
                      businessType: adv.business_type,
                      representative: adv.representative_name,
                    }
                  : null
              }
              influencer={
                inf
                  ? {
                      region: region ? `${region.flag} ${region.name}` : null,
                      bio: inf.bio,
                      points: inf.total_points,
                      channelCount: ch?.count ?? 0,
                      totalFollowers: ch?.followers ?? 0,
                    }
                  : null
              }
            />
          );
                };
        if (filter === "pending") {
          // 채널이 없는 크리에이터는 검수할 대상이 없어 승인할 수 없다 — 검수 가능한 사람부터 보여준다
          const reviewable = (p: (typeof members)[number]) =>
            p.role !== "influencer" || (channelAgg.get(p.id)?.count ?? 0) > 0;
          const sorted = [...members].sort((a, b) => Number(reviewable(b)) - Number(reviewable(a)));
          const okCount = sorted.filter(reviewable).length;
          const noChannel = sorted.length - okCount;
          return (
            <div className="mt-6">
              {noChannel > 0 && (
                <p className="mb-3 text-xs text-muted-foreground">
                  검수 가능 <b className="text-foreground">{okCount}명</b> · 채널 미등록 {noChannel}명
                  (채널이 등록되면 검수할 수 있어요 — 매일 아침 등록 안내가 자동 발송됩니다)
                </p>
              )}
              <BulkApproveList
                items={sorted.map((p) => ({ id: p.id, name: p.name, node: renderRow(p), reviewable: reviewable(p) }))}
              />
            </div>
          );
        }
        return (
          <div className="mt-6 space-y-2">{members.map((p) => renderRow(p))}</div>
        );
      })()}
      <div className="mt-2 space-y-2">
        {members.length === 0 && (
          <div className="rounded-3xl border border-dashed border-border bg-background p-10 text-center text-sm text-muted-foreground">
            {filter === "pending"
              ? "승인 대기중인 회원이 없습니다."
              : "해당 조건의 회원이 없습니다."}
          </div>
        )}
      </div>
    </div>
  );
}
