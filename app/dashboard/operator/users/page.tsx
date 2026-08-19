import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { MemberRow } from "./MemberRow";
import { BulkApproveList } from "./BulkApproveList";
import { InviteMemberPanel } from "./InviteMemberPanel";

export const metadata = { title: "회원 관리 — 루비AI" };

type Filter = "pending" | "all" | "advertiser" | "influencer";

const TABS: { key: Filter; label: string }[] = [
  { key: "pending", label: "승인 대기" },
  { key: "all", label: "전체" },
  { key: "advertiser", label: "광고주" },
  { key: "influencer", label: "인플루언서" },
];

export default async function OperatorUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "operator") redirect("/dashboard");

  const params = await searchParams;
  const filter: Filter = (TABS.find((t) => t.key === params.filter)?.key ?? "pending") as Filter;

  const supabase = await createClient();

  // 전체 회원 + 역할별 상세를 병렬 로드 (운영자 RLS로 전부 열람 가능)
  const [profilesRes, advertisersRes, influencersRes, channelsRes, regionsRes] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, email, name, phone, role, approved, created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("advertisers")
        .select("profile_id, company_name, business_number, business_type, representative_name, advertiser_kind"),
      supabase.from("influencers").select("profile_id, region_id, bio, total_points"),
      supabase.from("influencer_channels").select("influencer_id, followers"),
      supabase.from("regions").select("id, flag, name"),
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
  const counts: Record<Filter, number> = {
    pending: all.filter((p) => !p.approved).length,
    all: all.length,
    advertiser: all.filter((p) => p.role === "advertiser").length,
    influencer: all.filter((p) => p.role === "influencer").length,
  };

  const members = all.filter((p) => {
    if (filter === "pending") return !p.approved;
    if (filter === "advertiser") return p.role === "advertiser";
    if (filter === "influencer") return p.role === "influencer";
    return true;
  });

  return (
    <div>
      <h1 className="display text-3xl font-semibold lg:text-4xl">회원 관리</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        가입 회원의 사업자 정보·채널 현황을 검수하고, 승인 상태를 관리합니다. 광고주·대행사·크리에이터를 직접 추가(초대)할 수도 있어요.
      </p>
      <InviteMemberPanel regions={(regionsRes.data ?? []).map((r) => ({ id: r.id, name: r.name, flag: r.flag }))} />

      {/* Filter tabs */}
      <div className="mt-8 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/dashboard/operator/users?filter=${t.key}`}
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
        return filter === "pending" ? (
          <div className="mt-6">
            <BulkApproveList
              items={members.map((p) => ({ id: p.id, name: p.name, node: renderRow(p) }))}
            />
          </div>
        ) : (
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
