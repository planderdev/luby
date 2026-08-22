import Link from "next/link";
import { Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ApplicantRow } from "./ApplicantRow";
import { AiFitButton } from "./AiFitButton";
import type { ApplicantFit } from "@/lib/ai/applicant-fit";

export async function ApplicantList({
  campaignId,
  maxVisible = null,
  canAiReview = false,
  recruitCount = 0,
}: {
  campaignId: string;
  /** 남은 모집 인원 계산용 */
  recruitCount?: number;
  /** null = 무제한. FREE 플랜은 10명까지만 서버에서 렌더링. */
  maxVisible?: number | null;
  /** BUSINESS 이상: 제출물 AI 사전 검수 버튼 노출 */
  canAiReview?: boolean;
}) {
  const supabase = await createClient();

  const { data: allApplications, count: totalCount } = await supabase
    .from("applications")
    .select("id, message, status, created_at, influencer_id, ai_fit", { count: "exact" })
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: false });

  // 대기 응모자는 AI 적합도 점수가 있으면 점수순(미평가는 뒤), 나머지는 최신순 유지
  const fitOf = (a: { ai_fit: unknown }) => (a.ai_fit as ApplicantFit | null)?.score ?? -1;
  const sorted = [...(allApplications ?? [])].sort((a, b) => {
    if (a.status === "pending" && b.status === "pending") return fitOf(b) - fitOf(a);
    return 0;
  });
  const applications = maxVisible !== null ? sorted.slice(0, maxVisible) : sorted;
  const pendingAll = (allApplications ?? []).filter((a) => a.status === "pending");
  const unscored = pendingAll.filter((a) => !a.ai_fit).length;
  const scoredCount = pendingAll.length - unscored;
  const hiddenCount =
    maxVisible !== null ? Math.max(0, (totalCount ?? 0) - maxVisible) : 0;

  if (!applications || applications.length === 0) {
    return (
      <section className="rounded-3xl glass-card p-8 text-center">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          응모자
        </h3>
        <p className="mt-3 text-sm text-muted-foreground">아직 응모자가 없습니다.</p>
      </section>
    );
  }

  // Fetch influencer profiles + region + content submissions
  const ids = applications.map((a) => a.influencer_id);
  const [profiles, influencers, channels, submissions] = await Promise.all([
    supabase.from("profiles").select("id, name, avatar_url").in("id", ids),
    supabase.from("influencers").select("profile_id, region_id, total_points").in("profile_id", ids),
    supabase
      .from("influencer_channels")
      .select("influencer_id, channel_type_id, handle, url, followers")
      .in("influencer_id", ids),
    supabase
      .from("submissions")
      .select("id, application_id, status, content_url, note, feedback, submitted_at, ai_review")
      .in(
        "application_id",
        applications.map((a) => a.id)
      ),
  ]);
  const submissionByApp = new Map(
    (submissions.data ?? []).map((s) => [s.application_id, s])
  );

  const profileById = new Map((profiles.data ?? []).map((p) => [p.id, p]));
  const influencerById = new Map((influencers.data ?? []).map((i) => [i.profile_id, i]));
  const channelsByInfluencer = new Map<string, typeof channels.data>();
  for (const c of channels.data ?? []) {
    const arr = channelsByInfluencer.get(c.influencer_id) ?? [];
    arr.push(c);
    channelsByInfluencer.set(c.influencer_id, arr);
  }

  const regionIds = [
    ...new Set((influencers.data ?? []).map((i) => i.region_id).filter(Boolean) as string[]),
  ];
  const { data: regions } =
    regionIds.length > 0
      ? await supabase.from("regions").select("id, flag, name").in("id", regionIds)
      : { data: [] };
  const regionById = new Map((regions ?? []).map((r) => [r.id, r]));

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h3 className="display text-2xl font-semibold">응모자 ({totalCount ?? applications.length})</h3>
        {canAiReview && pendingAll.length > 0 && (
          <AiFitButton
            campaignId={campaignId}
            unscored={unscored}
            scored={scoredCount}
            remainingSlots={Math.max(0, recruitCount - (allApplications ?? []).filter((a) => a.status === "selected" || a.status === "completed").length)}
          />
        )}
      </div>
      <div className="mt-4 space-y-2">
        {applications.map((a) => {
          const profile = profileById.get(a.influencer_id);
          const inf = influencerById.get(a.influencer_id);
          const region = inf?.region_id ? regionById.get(inf.region_id) : null;
          const chs = channelsByInfluencer.get(a.influencer_id) ?? [];
          const sub = submissionByApp.get(a.id);
          return (
            <ApplicantRow
              key={a.id}
              applicationId={a.id}
              campaignId={campaignId}
              status={a.status}
              message={a.message}
              createdAt={a.created_at}
              name={profile?.name ?? "—"}
              influencerId={a.influencer_id}
              region={region ? `${region.flag} ${region.name}` : "—"}
              points={inf?.total_points ?? 0}
              channels={(chs ?? []).map((c) => ({
                handle: c.handle ?? c.url,
                followers: c.followers,
              }))}
              canAiReview={canAiReview}
              aiFit={(a.ai_fit as ApplicantFit | null) ?? null}
              submission={
                sub
                  ? {
                      id: sub.id,
                      status: sub.status,
                      contentUrl: sub.content_url,
                      note: sub.note,
                      feedback: sub.feedback,
                      submittedAt: sub.submitted_at,
                      aiReview: (sub.ai_review as never) ?? null,
                    }
                  : null
              }
            />
          );
        })}
      </div>

      {hiddenCount > 0 && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent/30 bg-accent-soft/40 px-5 py-4">
          <div className="flex items-center gap-2 text-sm">
            <Lock className="size-4 shrink-0 text-accent-ink" />
            <span>
              응모자 <strong>{hiddenCount}명</strong>이 더 있습니다. FREE 플랜은 10명까지 열람할
              수 있어요.
            </span>
          </div>
          <Link
            href="/dashboard/billing"
            className="rounded-full bg-foreground px-4 py-2 text-xs font-medium text-background"
          >
            BUSINESS로 전체 열람
          </Link>
        </div>
      )}
    </section>
  );
}
