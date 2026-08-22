import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { CampaignDecisionRow } from "./CampaignDecisionRow";
import type { Precheck } from "@/lib/ai/campaign-precheck";

export const metadata = { title: "캠페인 검수 — 루비AI" };

export default async function OperatorCampaignsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "operator") redirect("/dashboard");

  const supabase = await createClient();
  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("id, title, business_name, status, advertiser_id, recruit_start, recruit_end, created_at, ai_precheck, ai_prechecked_at, review_round, review_note")
    .eq("status", "pending_approval")
    .order("created_at", { ascending: false });

  const advIds = [...new Set((campaigns ?? []).map((c) => c.advertiser_id))];
  const { data: profiles } =
    advIds.length > 0
      ? await supabase.from("profiles").select("id, name, email").in("id", advIds)
      : { data: [] };
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  // AI 점검 결과가 있으면 위험(block) → 주의(caution) → 미점검 → 통과(ok) 순, 같은 등급은 오래된 요청 먼저
  const rank = (v: string | undefined) => (v === "block" ? 0 : v === "caution" ? 1 : v === undefined ? 2 : 3);
  const sorted = [...(campaigns ?? [])].sort((a, b) => {
    const ra = rank((a.ai_precheck as Precheck | null)?.verdict), rb = rank((b.ai_precheck as Precheck | null)?.verdict);
    if (ra !== rb) return ra - rb;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
  const counts = { block: 0, caution: 0, ok: 0, none: 0 };
  for (const c of campaigns ?? []) {
    const v = (c.ai_precheck as Precheck | null)?.verdict;
    if (v === "block") counts.block++; else if (v === "caution") counts.caution++; else if (v === "ok") counts.ok++; else counts.none++;
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-3xl font-semibold lg:text-4xl">캠페인 검수 대기</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            광고주가 검수 요청한 캠페인입니다. 검수 대기에 들어오면 AI 사전 점검이 자동으로 실행되며, 위험·주의 순으로 정렬됩니다.
          </p>
          {(campaigns ?? []).length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
              <span className="rounded-full bg-danger-soft px-2.5 py-1 font-medium text-danger">위험 {counts.block}</span>
              <span className="rounded-full bg-warning-soft px-2.5 py-1 font-medium text-warning">주의 {counts.caution}</span>
              <span className="rounded-full bg-success-soft px-2.5 py-1 font-medium text-success">통과 {counts.ok}</span>
              {counts.none > 0 && <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">점검 중·미점검 {counts.none}</span>}
            </div>
          )}
        </div>
        <Link href="/dashboard/operator/campaigns/new" className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background">
          광고주 대신 캠페인 만들기
        </Link>
      </div>

      <div className="mt-8 space-y-2">
        {sorted.map((c) => {
          const adv = profileById.get(c.advertiser_id);
          return (
            <CampaignDecisionRow
              key={c.id}
              campaignId={c.id}
              title={c.title}
              businessName={c.business_name}
              advertiserName={adv?.name ?? "—"}
              advertiserEmail={adv?.email ?? ""}
              recruitStart={c.recruit_start}
              recruitEnd={c.recruit_end}
              initialPrecheck={(c.ai_precheck as Precheck | null) ?? null}
              initialCheckedAt={c.ai_prechecked_at}
              reviewRound={c.review_round ?? 0}
              previousNote={c.review_note}
            />
          );
        })}
        {(!campaigns || campaigns.length === 0) && (
          <div className="rounded-3xl border border-dashed border-border bg-background p-10 text-center text-sm text-muted-foreground">
            검수 대기중인 캠페인이 없습니다.
          </div>
        )}
      </div>

      <div className="mt-10 text-xs text-muted-foreground">
        <Link href="/dashboard" className="hover:text-foreground">
          ← 대시보드로
        </Link>
      </div>
    </div>
  );
}
