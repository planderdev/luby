import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { fetchUICatalog } from "@/lib/cache/ui-catalog";
import { CampaignBuilder } from "@/app/dashboard/campaigns/new/CampaignBuilder";
import { Building2, Search } from "lucide-react";

export const metadata = { title: "운영자 대행 캠페인 — 루비AI" };
export const maxDuration = 60;

/** 운영자: 광고주 대신 캠페인 등록. 1) 광고주 선택(?advertiser=) 2) 빌더(명의 표시, 검수 요청 시 바로 모집중) */
export default async function OperatorNewCampaignPage({
  searchParams,
}: {
  searchParams: Promise<{ advertiser?: string; q?: string }>;
}) {
  const { advertiser, q } = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "operator") redirect("/dashboard");
  const supabase = await createClient();

  if (advertiser && /^[0-9a-f-]{36}$/.test(advertiser)) {
    const { data: adv } = await supabase.from("advertisers").select("profile_id, company_name, advertiser_kind").eq("profile_id", advertiser).maybeSingle();
    const { data: prof } = await supabase.from("profiles").select("name, email").eq("id", advertiser).maybeSingle();
    if (adv && prof) {
      const catalog = await fetchUICatalog();
      return (
        <CampaignBuilder
          onBehalfOf={{ id: advertiser, label: `${adv.company_name} (${prof.name} · ${prof.email})` }}
          initial={{ business_name: adv.company_name }}
          regions={catalog.regions}
          categories={catalog.categories}
          channels={catalog.channels}
          promotionTypes={catalog.promotionTypes}
        />
      );
    }
  }

  // 광고주 선택
  let query = supabase.from("advertisers").select("profile_id, company_name, advertiser_kind, business_number").order("created_at", { ascending: false }).limit(30);
  if (q?.trim()) query = query.ilike("company_name", `%${q.trim().replace(/[,()]/g, " ")}%`);
  const { data: advs } = await query;
  const ids = (advs ?? []).map((a) => a.profile_id);
  const { data: profs } = ids.length ? await supabase.from("profiles").select("id, name, email").in("id", ids) : { data: [] };
  const pById = new Map((profs ?? []).map((p) => [p.id, p]));

  return (
    <div>
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">운영</p>
      <h1 className="display mt-2 text-3xl font-semibold lg:text-4xl">광고주 대신 캠페인 만들기</h1>
      <p className="mt-2 text-sm text-muted-foreground">캠페인을 등록할 광고주를 고르세요. 광고주에게 "운영자가 대신 등록" 알림이 가고, 검수 요청 시 바로 모집이 시작됩니다.</p>

      <form className="mt-6 flex gap-2" method="get">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input name="q" defaultValue={q ?? ""} placeholder="회사·상호명으로 검색" className="w-full rounded-full border border-border bg-background py-2.5 pl-11 pr-4 text-sm outline-none" />
        </div>
        <button type="submit" className="rounded-full border border-border bg-background px-4 py-2 text-sm hover:bg-muted">검색</button>
      </form>

      <ul className="mt-4 divide-y divide-border rounded-3xl glass-card">
        {(advs ?? []).map((a) => {
          const p = pById.get(a.profile_id);
          return (
            <li key={a.profile_id}>
              <Link href={`/dashboard/operator/campaigns/new?advertiser=${a.profile_id}`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/40">
                <div className="flex size-9 items-center justify-center rounded-xl bg-foreground text-background"><Building2 className="size-4" /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <span className="truncate">{a.company_name}</span>
                    {a.advertiser_kind === "agency" && <span className="rounded-full border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">대행사</span>}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">{p?.name} · {p?.email}{a.business_number ? ` · ${a.business_number}` : ""}</div>
                </div>
                <span className="text-xs text-muted-foreground">선택 →</span>
              </Link>
            </li>
          );
        })}
        {(!advs || advs.length === 0) && <li className="px-5 py-8 text-center text-sm text-muted-foreground">검색 결과가 없어요.</li>}
      </ul>
    </div>
  );
}
