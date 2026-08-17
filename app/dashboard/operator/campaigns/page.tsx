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
    .select("id, title, business_name, status, advertiser_id, recruit_start, recruit_end, created_at, ai_precheck, ai_prechecked_at")
    .eq("status", "pending_approval")
    .order("created_at", { ascending: false });

  const advIds = [...new Set((campaigns ?? []).map((c) => c.advertiser_id))];
  const { data: profiles } =
    advIds.length > 0
      ? await supabase.from("profiles").select("id, name, email").in("id", advIds)
      : { data: [] };
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  return (
    <div>
      <h1 className="display text-3xl font-semibold lg:text-4xl">캠페인 검수 대기</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        광고주가 검수 요청한 캠페인입니다. 내용을 확인하고 승인/반려하세요.
      </p>

      <div className="mt-8 space-y-2">
        {(campaigns ?? []).map((c) => {
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
