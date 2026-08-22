import { getCurrentProfile } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { AdvertiserOverview } from "./_views/AdvertiserOverview";
import { InfluencerOverview } from "./_views/InfluencerOverview";
import { OperatorOverview } from "./_views/OperatorOverview";
import { redirect } from "next/navigation";
import { fetchUICatalog } from "@/lib/cache/ui-catalog";
import { rankCampaigns, campaignBadges, type CreatorSignals } from "@/lib/campaign-ranking";
import { creatorCompleteness, advertiserCompleteness } from "@/lib/profile-completeness";

export const metadata = { title: "대시보드 — 루비AI" };

export default async function DashboardPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();

  if (profile.role === "advertiser") {
    const [{ data: myCampaigns }, { data: subscription }] = await Promise.all([
      supabase
        .from("campaigns")
        .select("id, status, recruit_end")
        .eq("advertiser_id", profile.id),
      supabase
        .from("subscriptions")
        .select("status, started_at, expires_at, plan_id")
        .eq("advertiser_id", profile.id)
        .maybeSingle(),
    ]);
    const campaigns = myCampaigns ?? [];
    const campaignIds = campaigns.map((c) => c.id);
    const campaignCount = campaigns.length;
    const openCount = campaigns.filter((c) => c.status === "open").length;
    const draftCount = campaigns.filter((c) => c.status === "draft").length;

    const now = Date.now();
    const closingSoonCount = campaigns.filter(
      (c) =>
        c.status === "open" &&
        new Date(c.recruit_end).getTime() - now < 3 * 24 * 60 * 60 * 1000 &&
        new Date(c.recruit_end).getTime() > now
    ).length;

    // 오늘 할 일: 대기 응모자 · 검수 대기 제출물 · 안읽은 메시지
    const [{ count: pendingApplicants }, { data: myApps }, planRes] = await Promise.all([
      campaignIds.length
        ? supabase
            .from("applications")
            .select("id", { count: "exact", head: true })
            .in("campaign_id", campaignIds)
            .eq("status", "pending")
        : Promise.resolve({ count: 0 }),
      campaignIds.length
        ? supabase
            .from("applications")
            .select("id")
            .in("campaign_id", campaignIds)
            .in("status", ["selected", "completed"])
        : Promise.resolve({ data: [] }),
      subscription?.plan_id
        ? supabase
            .from("plans")
            .select("name, tier, monthly_price")
            .eq("id", subscription.plan_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    const appIds = (myApps ?? []).map((a) => a.id);
    const [{ count: submittedCount }, { count: unreadMessages }] = await Promise.all([
      appIds.length
        ? supabase
            .from("submissions")
            .select("id", { count: "exact", head: true })
            .in("application_id", appIds)
            .eq("status", "submitted")
        : Promise.resolve({ count: 0 }),
      appIds.length
        ? supabase
            .from("messages")
            .select("id", { count: "exact", head: true })
            .in("application_id", appIds)
            .neq("sender_id", profile.id)
            .is("read_at", null)
        : Promise.resolve({ count: 0 }),
    ]);

    const plan = planRes.data;
    const { data: advRow } = await supabase
      .from("advertisers")
      .select("description, website, category_id, contact_phone")
      .eq("profile_id", profile.id)
      .maybeSingle();
    const advCompleteness = advertiserCompleteness({
      avatarUrl: profile.avatar_url,
      description: advRow?.description ?? null,
      categoryId: advRow?.category_id ?? null,
      website: advRow?.website ?? null,
      contactPhone: advRow?.contact_phone ?? profile.phone ?? null,
    });
    const expiresAt = subscription?.expires_at ? new Date(subscription.expires_at).getTime() : null;
    const daysToExpire =
      expiresAt && plan && plan.tier !== "free"
        ? Math.ceil((expiresAt - now) / (24 * 60 * 60 * 1000))
        : null;

    return (
      <AdvertiserOverview
        name={profile.name}
        campaignCount={campaignCount}
        openCount={openCount}
        plan={plan}
        todo={{
          pendingApplicants: pendingApplicants ?? 0,
          submittedCount: submittedCount ?? 0,
          unreadMessages: unreadMessages ?? 0,
          closingSoonCount,
          draftCount,
          daysToExpire,
        }}
        completeness={advCompleteness}
      />
    );
  }

  if (profile.role === "influencer") {
    const [{ data: myApps }, { data: influencer }, { count: newCampaigns }] = await Promise.all([
      supabase.from("applications").select("id, status, campaign_id").eq("influencer_id", profile.id),
      supabase
        .from("influencers")
        .select("total_points, region_id, bio, public_profile")
        .eq("profile_id", profile.id)
        .maybeSingle(),
      supabase
        .from("campaigns")
        .select("id", { count: "exact", head: true })
        .eq("status", "open")
        .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    ]);
    const apps = myApps ?? [];
    const applicationCount = apps.length;
    const selectedApps = apps.filter((a) => a.status === "selected");
    const selectedCount = selectedApps.length;
    const activeAppIds = apps
      .filter((a) => a.status === "selected" || a.status === "completed")
      .map((a) => a.id);

    // 오늘 할 일: 제출 대기(선정됐는데 제출물 없음) · 수정 요청 · 안읽은 메시지 · 받은 초대
    const [{ data: subs }, { count: unreadMessages }, regionRes, { count: pendingInvites }] =
      await Promise.all([
      activeAppIds.length
        ? supabase
            .from("submissions")
            .select("application_id, status")
            .in("application_id", activeAppIds)
        : Promise.resolve({ data: [] }),
      activeAppIds.length
        ? supabase
            .from("messages")
            .select("id", { count: "exact", head: true })
            .in("application_id", activeAppIds)
            .neq("sender_id", profile.id)
            .is("read_at", null)
        : Promise.resolve({ count: 0 }),
      influencer?.region_id
        ? supabase
            .from("regions")
            .select("flag, name")
            .eq("id", influencer.region_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from("campaign_invitations")
        .select("id", { count: "exact", head: true })
        .eq("influencer_id", profile.id)
        .eq("status", "pending"),
    ]);
    const submittedAppIds = new Set((subs ?? []).map((s) => s.application_id));
    const needSubmitCount = selectedApps.filter((a) => !submittedAppIds.has(a.id)).length;
    const revisionCount = (subs ?? []).filter((s) => s.status === "revision_requested").length;
    const region = regionRes.data;

    const { data: refStats } = await supabase.rpc("get_my_referral_stats");
    const referrals = Number((refStats as { total?: number } | null)?.total ?? 0);

    // 프로필 완성도 (승인 여부와 무관 — 승인 대기 중에도 채우도록 유도)
    const [{ data: myChannels }, { data: myCatRows }] = await Promise.all([
      supabase.from("influencer_channels").select("followers").eq("influencer_id", profile.id),
      supabase.from("influencer_categories").select("category_id").eq("influencer_id", profile.id),
    ]);
    const completeness = creatorCompleteness({
      avatarUrl: profile.avatar_url,
      bio: influencer?.bio ?? null,
      regionId: influencer?.region_id ?? null,
      channelCount: (myChannels ?? []).length,
      channelsWithFollowers: (myChannels ?? []).filter((c) => (c.followers ?? 0) > 0).length,
      categoryCount: (myCatRows ?? []).length,
      publicProfile: !!influencer?.public_profile,
    });

    // 추천 캠페인 3개 (승인된 크리에이터만) — 목록 페이지와 같은 랭킹 로직
    let recommended: {
      id: string; title: string; business_name: string; thumbnail_url: string | null;
      point_amount: number; recruit_end: string; recruit_count: number;
      badges: string[]; categoryEmoji: string; categoryName: string;
    }[] = [];
    if (profile.approved) {
      const [{ data: openCampaigns }, { data: myCats }, catalog] = await Promise.all([
        supabase
          .from("campaigns")
          .select("id, title, business_name, thumbnail_url, point_amount, recruit_end, recruit_count, category_id, region_id")
          .eq("status", "open")
          .order("created_at", { ascending: false })
          .limit(60),
        supabase.from("influencer_categories").select("category_id").eq("influencer_id", profile.id),
        fetchUICatalog(),
      ]);
      const signals: CreatorSignals = {
        categoryIds: new Set((myCats ?? []).map((c) => c.category_id)),
        regionId: influencer?.region_id ?? null,
        appliedCampaignIds: new Set(apps.map((a) => a.campaign_id)),
      };
      const catById = new Map(catalog.categories.map((c) => [c.id, c]));
      recommended = rankCampaigns(openCampaigns ?? [], signals)
        .filter((c) => !signals.appliedCampaignIds.has(c.id))
        .slice(0, 3)
        .map((c) => ({
          id: c.id, title: c.title, business_name: c.business_name, thumbnail_url: c.thumbnail_url,
          point_amount: c.point_amount, recruit_end: c.recruit_end, recruit_count: c.recruit_count,
          badges: campaignBadges(c, signals),
          categoryEmoji: catById.get(c.category_id)?.emoji ?? "",
          categoryName: catById.get(c.category_id)?.name ?? "",
        }));
    }

    return (
      <InfluencerOverview
        name={profile.name}
        approved={profile.approved}
        applicationCount={applicationCount}
        selectedCount={selectedCount}
        totalPoints={influencer?.total_points ?? 0}
        region={region ? `${region.flag} ${region.name}` : "—"}
        todo={{
          needSubmitCount,
          revisionCount,
          unreadMessages: unreadMessages ?? 0,
          newCampaigns: newCampaigns ?? 0,
          pendingInvites: pendingInvites ?? 0,
        }}
        recommended={recommended}
        completeness={completeness}
        referrals={referrals}
      />
    );
  }

  // operator
  const [
    { count: pendingUsersCount },
    { count: pendingCampaignsCount },
    { count: pendingWithdrawals },
    { count: openCampaigns },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("approved", false),
    supabase
      .from("campaigns")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending_approval"),
    supabase
      .from("point_withdrawals")
      .select("id", { count: "exact", head: true })
      .eq("status", "requested"),
    supabase.from("campaigns").select("id", { count: "exact", head: true }).eq("status", "open"),
  ]);

  return (
    <OperatorOverview
      name={profile.name}
      pendingUsersCount={pendingUsersCount ?? 0}
      pendingCampaignsCount={pendingCampaignsCount ?? 0}
      pendingWithdrawals={pendingWithdrawals ?? 0}
      openCampaigns={openCampaigns ?? 0}
    />
  );
}
