import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, Users, MapPin, Tag, Coins, Copy } from "lucide-react";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { getEntitlements } from "@/lib/plans/entitlements";
import { ApplyButton } from "./ApplyButton";
import { ApplicantList } from "./ApplicantList";
import { AIMatches } from "./AIMatches";
import { CampaignPerformance } from "./CampaignPerformance";
import { CancelCampaignButton } from "./CancelCampaignButton";
import { ShareLinkButton } from "./ShareLinkButton";
import { Skeleton } from "@/components/dashboard/Skeleton";

const STATUS_LABEL: Record<string, { label: string; tone: string }> = {
  draft: { label: "초안", tone: "bg-muted text-muted-foreground" },
  pending_approval: { label: "검수중", tone: "bg-warning-soft text-warning" },
  open: { label: "모집중", tone: "bg-success-soft text-success" },
  closed: { label: "마감", tone: "bg-muted text-muted-foreground" },
  completed: { label: "완료", tone: "bg-foreground text-background" },
  cancelled: { label: "취소", tone: "bg-danger-soft text-danger" },
};

function fmtDateTime(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()} ${d
    .getHours()
    .toString()
    .padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

// AI 인플루언서 매칭 액션은 풀 분석에 수십 초가 걸릴 수 있다.
// Vercel 함수 기본 타임아웃(10s)에 잘리지 않도록 여유 확보.
export const maxDuration = 60;

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const { id } = await params;
  const supabase = await createClient();

  const { data: campaign } = await supabase
    .from("campaigns")
    .select(
      "id, advertiser_id, title, business_name, thumbnail_url, status, region_id, category_id, promotion_type_id, recruit_count, recruit_start, recruit_end, experience_start, experience_end, same_day_reservation, always_open, point_amount"
    )
    .eq("id", id)
    .maybeSingle();
  if (!campaign) notFound();

  // Permission check: advertiser can see own; influencer & operator can see open/closed/completed
  const isOwner = profile.role === "advertiser" && campaign.advertiser_id === profile.id;
  const isOperator = profile.role === "operator";
  const isInfluencer = profile.role === "influencer";
  const isPublic = ["open", "closed", "completed"].includes(campaign.status);

  if (!isOwner && !isOperator && !(isInfluencer && isPublic)) {
    redirect("/dashboard/campaigns");
  }

  // 플랜 권한 (소유 광고주의 AI 매칭·응모자 열람 제한에만 사용)
  const entitlements = await getEntitlements(profile.id);

  const [region, category, promotion, channelLinks, missions, keywords, offerings, schedules] =
    await Promise.all([
      supabase.from("regions").select("flag, name").eq("id", campaign.region_id).maybeSingle(),
      supabase
        .from("categories")
        .select("emoji, name")
        .eq("id", campaign.category_id)
        .maybeSingle(),
      supabase
        .from("promotion_types")
        .select("name, description")
        .eq("id", campaign.promotion_type_id)
        .maybeSingle(),
      supabase
        .from("campaign_channels")
        .select("channel_type_id")
        .eq("campaign_id", id),
      supabase
        .from("campaign_missions")
        .select("channel_type_id, description")
        .eq("campaign_id", id),
      supabase.from("campaign_keywords").select("keyword").eq("campaign_id", id),
      supabase
        .from("campaign_offerings")
        .select("title, description, estimated_value")
        .eq("campaign_id", id),
      supabase
        .from("campaign_schedules")
        .select("day_of_week, start_time, end_time")
        .eq("campaign_id", id),
    ]);

  const channelIds = (channelLinks.data ?? []).map((c) => c.channel_type_id);
  const { data: channelTypes } =
    channelIds.length > 0
      ? await supabase.from("channel_types").select("id, name").in("id", channelIds)
      : { data: [] };
  const channelNameById = new Map((channelTypes ?? []).map((c) => [c.id, c.name]));

  // Influencer existing application
  let myApplicationStatus: string | null = null;
  if (isInfluencer) {
    const { data: app } = await supabase
      .from("applications")
      .select("status")
      .eq("campaign_id", id)
      .eq("influencer_id", profile.id)
      .maybeSingle();
    myApplicationStatus = app?.status ?? null;
  }

  // Owner: 취소 확인 문구용 응모자 수 (취소·거절 제외)
  let applicantCount = 0;
  if (isOwner) {
    const { count } = await supabase
      .from("applications")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", id)
      .in("status", ["pending", "selected"]);
    applicantCount = count ?? 0;
  }

  return (
    <div>
      <Link
        href="/dashboard/campaigns"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        캠페인 목록
      </Link>

      <header className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              STATUS_LABEL[campaign.status]?.tone ?? "bg-muted text-muted-foreground"
            }`}
          >
            {STATUS_LABEL[campaign.status]?.label ?? campaign.status}
          </span>
          <h1 className="display mt-3 text-3xl font-semibold lg:text-4xl">{campaign.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            <Link
              href={`/dashboard/advertisers/${campaign.advertiser_id}`}
              className="hover:text-foreground hover:underline underline-offset-2"
              title="광고주 프로필 보기"
            >
              {campaign.business_name}
            </Link>
          </p>
        </div>

        {isOwner && (
          <div className="flex flex-wrap items-center gap-2">
            {["open", "closed", "completed"].includes(campaign.status) && <ShareLinkButton campaignId={id} />}
            <Link
              href={`/dashboard/campaigns/new?from=${id}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-medium hover:bg-muted"
              title="이 캠페인의 내용으로 새 캠페인을 시작합니다 (일정은 새로 지정)"
            >
              <Copy className="size-3.5" /> 이 캠페인으로 새로 만들기
            </Link>
            {["pending_approval", "open", "closed"].includes(campaign.status) && (
              <CancelCampaignButton campaignId={id} applicantCount={applicantCount} />
            )}
          </div>
        )}
        {isInfluencer && campaign.status === "open" && (
          <ShareLinkButton campaignId={id} refId={profile.id} buttonLabel="친구에게 공유" />
        )}
        {isInfluencer && campaign.status === "open" && (
          <ApplyButton
            campaignId={id}
            disabled={!profile.approved}
            initialStatus={myApplicationStatus}
          />
        )}
        {isInfluencer && myApplicationStatus === "selected" && (
          <Link
            href="/dashboard/applications"
            className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background hover:bg-foreground/90"
          >
            콘텐츠 제출하러 가기 →
          </Link>
        )}
      </header>

      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Stat
          icon={<MapPin className="size-4" />}
          label="활동 지역"
          value={`${region.data?.flag ?? ""} ${region.data?.name ?? ""}`}
        />
        <Stat
          icon={<Tag className="size-4" />}
          label="카테고리"
          value={`${category.data?.emoji ?? ""} ${category.data?.name ?? ""}`}
        />
        <Stat
          icon={<Users className="size-4" />}
          label="모집 인원"
          value={`${campaign.recruit_count}명`}
        />
        <Stat
          icon={<Coins className="size-4" />}
          label="포인트"
          value={campaign.point_amount.toLocaleString()}
        />
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        {/* Left main */}
        <div className="space-y-4 lg:col-span-2">
          <Section title="홍보 유형">
            <p className="text-sm font-medium">{promotion.data?.name}</p>
            {promotion.data?.description && (
              <p className="mt-1 text-xs text-muted-foreground">{promotion.data.description}</p>
            )}
          </Section>

          <Section title="채널별 미션">
            {(missions.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">등록된 미션이 없습니다.</p>
            ) : (
              <div className="space-y-3">
                {(missions.data ?? []).map((m, i) => (
                  <div key={i} className="rounded-2xl bg-muted/50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {channelNameById.get(m.channel_type_id) ?? "채널"}
                    </div>
                    <p className="mt-1 text-sm">{m.description}</p>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="제공 내역">
            {(offerings.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">등록된 제공 내역이 없습니다.</p>
            ) : (
              <ul className="space-y-2">
                {(offerings.data ?? []).map((o, i) => (
                  <li key={i} className="flex items-start justify-between gap-4 border-b border-border pb-2 last:border-0 last:pb-0">
                    <div>
                      <div className="text-sm font-medium">{o.title}</div>
                      {o.description && (
                        <div className="mt-0.5 text-xs text-muted-foreground">{o.description}</div>
                      )}
                    </div>
                    {o.estimated_value && (
                      <div className="shrink-0 text-sm tabular-nums">
                        {o.estimated_value.toLocaleString()}원
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {keywords.data && keywords.data.length > 0 && (
            <Section title="키워드">
              <div className="flex flex-wrap gap-2">
                {keywords.data.map((k, i) => (
                  <span
                    key={i}
                    className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground"
                  >
                    #{k.keyword}
                  </span>
                ))}
              </div>
            </Section>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          <Section title="모집 기간">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="size-4 text-muted-foreground" />
              {fmtDateTime(campaign.recruit_start)}
            </div>
            <div className="mt-1 ml-6 text-xs text-muted-foreground">
              ~ {fmtDateTime(campaign.recruit_end)}
            </div>
          </Section>

          {(campaign.experience_start || campaign.experience_end) && (
            <Section title="체험 기간">
              {campaign.experience_start && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="size-4 text-muted-foreground" />
                  {fmtDateTime(campaign.experience_start)}
                </div>
              )}
              {campaign.experience_end && (
                <div className="mt-1 ml-6 text-xs text-muted-foreground">
                  ~ {fmtDateTime(campaign.experience_end)}
                </div>
              )}
            </Section>
          )}

          {(campaign.same_day_reservation || campaign.always_open) && (
            <Section title="운영 옵션">
              <div className="space-y-1.5 text-sm">
                {campaign.same_day_reservation && <div>✓ 당일 예약 가능</div>}
                {campaign.always_open && <div>✓ 24시간 운영</div>}
              </div>
            </Section>
          )}

          {!campaign.always_open && (schedules.data ?? []).length > 0 && (
            <Section title="가능 요일·시간">
              <ul className="space-y-1 text-sm">
                {(schedules.data ?? []).map((s, i) => (
                  <li key={i}>
                    {["일", "월", "화", "수", "목", "금", "토"][s.day_of_week ?? 0]}요일{" "}
                    {s.start_time?.slice(0, 5) ?? ""} ~ {s.end_time?.slice(0, 5) ?? ""}
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      </div>

      {/* Advertiser: AI influencer matching + applicants */}
      {isOwner && (
        <>
          <Suspense fallback={<Skeleton className="mt-10 h-64 rounded-3xl" />}>
            <CampaignPerformance
              campaignId={id}
              recruitCount={campaign.recruit_count}
              recruitEnd={campaign.recruit_end}
              pointAmount={campaign.point_amount}
              status={campaign.status}
            />
          </Suspense>
          <AIMatches
            campaignId={id}
            campaignTitle={campaign.title}
            campaignOpen={campaign.status === "open"}
            locked={!entitlements.aiMatching}
          />
          <Suspense
            fallback={
              <div className="mt-10 space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
              </div>
            }
          >
            <div className="mt-10">
              <ApplicantList
                campaignId={id}
                maxVisible={entitlements.maxApplicantViews}
                canAiReview={entitlements.aiMatching}
              />
            </div>
          </Suspense>
        </>
      )}
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-3xl glass-card p-5">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-lg font-semibold">{value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl glass-card p-6">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}
