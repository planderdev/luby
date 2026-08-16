import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { InvitationCard } from "./InvitationCard";

export const metadata = { title: "받은 초대 — 루비AI" };

export default async function InvitationsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login?redirect=/dashboard/invitations");
  if (profile.role !== "influencer") redirect("/dashboard");

  const supabase = await createClient();
  const { data: invitations } = await supabase
    .from("campaign_invitations")
    .select(
      "id, status, message, created_at, campaigns!inner(id, title, business_name, point_amount, recruit_end)"
    )
    .eq("influencer_id", profile.id)
    .order("created_at", { ascending: false });

  const list = invitations ?? [];
  const pendingCount = list.filter((i) => i.status === "pending").length;

  return (
    <div>
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">받은 초대</p>
      <h1 className="display mt-2 text-3xl font-semibold lg:text-4xl">
        {pendingCount > 0 ? `${pendingCount}개의 초대가 기다려요` : "캠페인 초대"}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        광고주가 직접 보낸 초대예요. 수락하면 즉시 응모되고, 광고주 선정 후 체험이 시작됩니다.
      </p>

      <div className="mt-8 space-y-3">
        {list.map((inv) => {
          const c = inv.campaigns as unknown as {
            id: string;
            title: string;
            business_name: string;
            point_amount: number;
            recruit_end: string;
          };
          return (
            <InvitationCard
              key={inv.id}
              id={inv.id}
              campaignId={c.id}
              campaignTitle={c.title}
              businessName={c.business_name}
              message={inv.message}
              pointAmount={c.point_amount}
              recruitEnd={c.recruit_end}
              status={inv.status}
            />
          );
        })}
        {list.length === 0 && (
          <div className="rounded-3xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            아직 받은 초대가 없어요. 프로필과 채널을 충실히 채워두면 광고주가 먼저 찾아옵니다.
          </div>
        )}
      </div>
    </div>
  );
}
