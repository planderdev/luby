import { createClient } from "@/lib/supabase/server";
import { ApplicantRow } from "./ApplicantRow";

export async function ApplicantList({ campaignId }: { campaignId: string }) {
  const supabase = await createClient();

  const { data: applications } = await supabase
    .from("applications")
    .select("id, message, status, created_at, influencer_id")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: false });

  if (!applications || applications.length === 0) {
    return (
      <section className="rounded-3xl border border-border bg-background p-8 text-center">
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
      .select("id, application_id, status, content_url, note, feedback, submitted_at")
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
      <h3 className="display text-2xl font-semibold">응모자 ({applications.length})</h3>
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
              region={region ? `${region.flag} ${region.name}` : "—"}
              points={inf?.total_points ?? 0}
              channels={(chs ?? []).map((c) => ({
                handle: c.handle ?? c.url,
                followers: c.followers,
              }))}
              submission={
                sub
                  ? {
                      id: sub.id,
                      status: sub.status,
                      contentUrl: sub.content_url,
                      note: sub.note,
                      feedback: sub.feedback,
                      submittedAt: sub.submitted_at,
                    }
                  : null
              }
            />
          );
        })}
      </div>
    </section>
  );
}
