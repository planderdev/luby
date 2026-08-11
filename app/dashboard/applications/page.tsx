import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { SubmissionCard } from "./SubmissionCard";

export const metadata = { title: "응모 — 루비AI" };

const STATUS_LABEL: Record<string, { label: string; tone: string }> = {
  pending: { label: "응모 대기", tone: "bg-muted text-foreground" },
  selected: { label: "선정됨", tone: "bg-accent-soft text-accent-ink" },
  rejected: { label: "미선정", tone: "bg-muted text-muted-foreground" },
  cancelled: { label: "취소", tone: "bg-muted text-muted-foreground" },
  completed: { label: "체험 완료", tone: "bg-foreground text-background" },
};

export default async function ApplicationsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();

  if (profile.role === "advertiser") {
    // Show all applications across the advertiser's campaigns
    const { data: campaigns } = await supabase
      .from("campaigns")
      .select("id, title")
      .eq("advertiser_id", profile.id);
    const campaignIds = (campaigns ?? []).map((c) => c.id);

    if (campaignIds.length === 0) {
      return <Empty title="응모자 받기" desc="아직 등록한 캠페인이 없어 응모자도 없습니다." />;
    }

    const { data: apps } = await supabase
      .from("applications")
      .select("id, campaign_id, status, message, created_at, influencer_id")
      .in("campaign_id", campaignIds)
      .order("created_at", { ascending: false });

    if (!apps || apps.length === 0) {
      return <Empty title="응모자" desc="아직 응모자가 없습니다." />;
    }

    const titleByCampaign = new Map((campaigns ?? []).map((c) => [c.id, c.title]));
    const ids = [...new Set(apps.map((a) => a.influencer_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, name")
      .in("id", ids);
    const nameById = new Map((profiles ?? []).map((p) => [p.id, p.name]));

    return (
      <div>
        <h1 className="display text-3xl font-semibold lg:text-4xl">응모자</h1>
        <div className="mt-8 space-y-2">
          {apps.map((a) => {
            const info = STATUS_LABEL[a.status] ?? STATUS_LABEL.pending;
            return (
              <Link
                key={a.id}
                href={`/dashboard/campaigns/${a.campaign_id}`}
                className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-background p-4 transition-colors hover:bg-muted/40"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{nameById.get(a.influencer_id) ?? "—"}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {titleByCampaign.get(a.campaign_id) ?? "—"}
                  </div>
                </div>
                <span className={`rounded-full px-3 py-1 text-[11px] font-medium ${info.tone}`}>
                  {info.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    );
  }

  if (profile.role === "influencer") {
    const { data: apps } = await supabase
      .from("applications")
      .select("id, campaign_id, status, message, created_at")
      .eq("influencer_id", profile.id)
      .order("created_at", { ascending: false });

    if (!apps || apps.length === 0) {
      return (
        <Empty
          title="내 응모"
          desc="아직 응모한 캠페인이 없어요. 마음에 드는 캠페인을 찾아 응모해보세요."
          ctaLabel="캠페인 둘러보기"
          ctaHref="/dashboard/campaigns"
        />
      );
    }

    const ids = apps.map((a) => a.campaign_id);
    const [{ data: campaigns }, { data: submissions }] = await Promise.all([
      supabase
        .from("campaigns")
        .select("id, title, business_name, recruit_end, point_amount")
        .in("id", ids),
      supabase
        .from("submissions")
        .select("id, application_id, status, content_url, note, feedback, submitted_at")
        .in(
          "application_id",
          apps.map((a) => a.id)
        ),
    ]);
    const campaignById = new Map((campaigns ?? []).map((c) => [c.id, c]));
    const submissionByApp = new Map((submissions ?? []).map((s) => [s.application_id, s]));

    return (
      <div>
        <h1 className="display text-3xl font-semibold lg:text-4xl">내 응모</h1>
        <div className="mt-8 space-y-2">
          {apps.map((a) => {
            const c = campaignById.get(a.campaign_id);
            const s = submissionByApp.get(a.id);
            return (
              <SubmissionCard
                key={a.id}
                applicationId={a.id}
                applicationStatus={a.status}
                campaignId={a.campaign_id}
                campaignTitle={c?.title ?? "—"}
                businessName={c?.business_name ?? ""}
                pointAmount={c?.point_amount ?? 0}
                submission={
                  s
                    ? {
                        id: s.id,
                        status: s.status,
                        contentUrl: s.content_url,
                        note: s.note,
                        feedback: s.feedback,
                        submittedAt: s.submitted_at,
                      }
                    : null
                }
              />
            );
          })}
        </div>
      </div>
    );
  }

  redirect("/dashboard");
}

function Empty({
  title,
  desc,
  ctaLabel,
  ctaHref,
}: {
  title: string;
  desc: string;
  ctaLabel?: string;
  ctaHref?: string;
}) {
  return (
    <div>
      <h1 className="display text-3xl font-semibold lg:text-4xl">{title}</h1>
      <div className="mt-8 rounded-3xl border border-dashed border-border bg-background p-10 text-center">
        <p className="text-sm text-muted-foreground">{desc}</p>
        {ctaLabel && ctaHref && (
          <Link
            href={ctaHref}
            className="mt-5 inline-flex rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background"
          >
            {ctaLabel}
          </Link>
        )}
      </div>
    </div>
  );
}
