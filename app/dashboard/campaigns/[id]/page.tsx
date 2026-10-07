import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, Users, MapPin, Tag, Coins, Copy, Pencil } from "lucide-react";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { getEntitlements } from "@/lib/plans/entitlements";
import { ApplyButton } from "./ApplyButton";
import { FitHint } from "./FitHint";
import { ApplicantList } from "./ApplicantList";
import { AIMatches } from "./AIMatches";
import { CampaignPerformance } from "./CampaignPerformance";
import { ExternalResultsPanel, type ExternalResultItem } from "./ExternalResultsPanel";
import { CancelCampaignButton } from "./CancelCampaignButton";
import { ShareLinkButton } from "./ShareLinkButton";
import { OperatorForceMatch } from "./OperatorForceMatch";
import { AdjustOpenCampaign } from "./AdjustOpenCampaign";
import type { ReportSummary } from "@/lib/ai/report-summary";
import { Skeleton } from "@/components/dashboard/Skeleton";
import { getAppLocale } from "@/lib/i18n/app-locale";
import { dashboardDict } from "@/lib/i18n/app/dashboard";
import { categoryLabel, regionLabel, promotionTypeLabel } from "@/lib/i18n/app/catalog";
import { getTranslationMap } from "@/lib/i18n/campaign-translations";

const STATUS_TONE: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  pending_approval: "bg-warning-soft text-warning",
  open: "bg-success-soft text-success",
  closed: "bg-muted text-muted-foreground",
  completed: "bg-foreground text-background",
  rejected: "bg-danger-soft text-danger",
  cancelled: "bg-danger-soft text-danger",
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
  // 화면 언어(다국어 2단계) — 공용 라벨은 세 언어, 광고주·운영자 전용 섹션은 한국어
  const locale = await getAppLocale({ profileLocale: profile.locale });
  const tc = dashboardDict[locale].campaign;
  const statusLabel = dashboardDict[locale].status;

  const { data: campaign } = await supabase
    .from("campaigns")
    .select(
      "id, advertiser_id, title, business_name, thumbnail_url, status, region_id, category_id, promotion_type_id, recruit_count, recruit_start, recruit_end, experience_start, experience_end, same_day_reservation, always_open, point_amount, review_note, reviewed_at, review_round, report_token, report_summary, report_summary_at"
    )
    .eq("id", id)
    .maybeSingle();
  if (!campaign) notFound();

  // Permission check: advertiser can see own; influencer & operator can see open/closed/completed
  const isOwner = profile.role === "advertiser" && campaign.advertiser_id === profile.id;
  const isOperator = profile.role === "operator";
  // 외부 채널(샤오홍슈 등) 체험단 결과 — 소유 광고주·운영자만 (RLS 도 동일)
  const { data: externalResults } = isOwner || isOperator
    ? await supabase
        .from("campaign_external_results")
        .select("id, seq, visited_at, creator_url, followers, post_url, likes, note")
        .eq("campaign_id", id)
        .order("seq")
    : { data: [] as ExternalResultItem[] };
  const isInfluencer = profile.role === "influencer";
  const isPublic = ["open", "closed", "completed"].includes(campaign.status);
  // 공개 페이지 영문·중문 번역 준비 여부 — 공유 링크 메뉴에 표시 (번역은 승인·수정 때 자동 생성)
  const { data: trRows } = isPublic ? await supabase.from("campaign_translations").select("locale").eq("campaign_id", id) : { data: [] as { locale: string }[] };
  const translated = (trRows ?? []).map((r) => r.locale);

  if (!isOwner && !isOperator && !(isInfluencer && isPublic)) {
    redirect("/dashboard/campaigns");
  }

  // 플랜 권한 (소유 광고주의 AI 매칭·응모자 열람 제한에만 사용)
  const entitlements = await getEntitlements(profile.id);

  const [region, category, promotion, channelLinks, missions, keywords, offerings, schedules] =
    await Promise.all([
      supabase.from("regions").select("code, flag, name").eq("id", campaign.region_id).maybeSingle(),
      supabase
        .from("categories")
        .select("slug, emoji, name")
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

  // /en·/zh 사용자는 공개 페이지와 같은 AI 번역본으로 본문을 본다(공개 상태 캠페인만 번역이 있다)
  const tr = locale !== "ko" && isPublic ? (await getTranslationMap([id], locale)).get(id) : undefined;
  const trMission = new Map((tr?.missions ?? []).map((m) => [m.source, m.description]));
  const trOffer = new Map((tr?.offerings ?? []).map((o) => [o.source, o]));
  const trKeyword = new Map((tr?.keywords ?? []).map((k) => k.split("\u001f") as [string, string]));
  const shownTitle = tr?.title ?? campaign.title;
  const shownBusiness = tr?.business_name ?? campaign.business_name;

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
        {tc.back}
      </Link>

      <header className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              STATUS_TONE[campaign.status] ?? "bg-muted text-muted-foreground"
            }`}
          >
            {statusLabel[campaign.status] ?? campaign.status}
          </span>
          <h1 className="display mt-3 text-3xl font-semibold lg:text-4xl">{shownTitle}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            <Link
              href={`/dashboard/advertisers/${campaign.advertiser_id}`}
              className="hover:text-foreground hover:underline underline-offset-2"
              title={tc.advertiserProfile}
            >
              {shownBusiness}
            </Link>
          </p>
        </div>

        {isOwner && (
          <div className="flex flex-wrap items-center gap-2">
            {["open", "closed", "completed"].includes(campaign.status) && <ShareLinkButton campaignId={id} translated={translated} />}
            {["draft", "pending_approval", "cancelled", "rejected"].includes(campaign.status) && (
              <Link
                href={`/dashboard/campaigns/${id}/edit`}
                className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-xs font-medium text-background"
              >
                <Pencil className="size-3.5" /> {campaign.status === "cancelled" || campaign.status === "rejected" ? "수정 후 다시 검수 요청" : "수정"}
              </Link>
            )}
            <Link
              href={`/dashboard/campaigns/new?from=${id}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-medium hover:bg-muted"
              title="이 캠페인의 내용으로 새 캠페인을 시작합니다 (일정은 새로 지정)"
            >
              <Copy className="size-3.5" /> 이 캠페인으로 새로 만들기
            </Link>
            {["pending_approval", "open", "closed", "rejected"].includes(campaign.status) && (
              <CancelCampaignButton campaignId={id} applicantCount={applicantCount} />
            )}
          </div>
        )}
        {isOperator && ["draft", "pending_approval", "cancelled", "rejected", "open"].includes(campaign.status) && (
          <Link
            href={`/dashboard/campaigns/${id}/edit`}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-medium hover:bg-muted"
            title="운영자 정정 — 상태는 바뀌지 않고 광고주에게 수정 알림이 갑니다"
          >
            <Pencil className="size-3.5" /> 내용 정정 (운영자)
          </Link>
        )}
        {isInfluencer && campaign.status === "open" && (
          <ShareLinkButton campaignId={id} refId={profile.id} buttonLabel={tc.shareFriends} />
        )}
        {isInfluencer && campaign.status === "open" && (
          <ApplyButton
            campaignId={id}
            disabled={!profile.approved}
            initialStatus={myApplicationStatus}
            locale={locale}
          />
        )}
        {isInfluencer && myApplicationStatus === "selected" && (
          <Link
            href="/dashboard/applications"
            className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background hover:bg-foreground/90"
          >
            {tc.goSubmit}
          </Link>
        )}
      </header>

      {/* 운영자 반려 사유 (광고주·운영자에게 표시) */}
      {campaign.status === "rejected" && campaign.review_note && (isOwner || isOperator) && (
        <section className="mt-6 rounded-3xl border border-danger/30 bg-danger-soft/30 p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-danger">검수 반려 · 수정 요청{campaign.review_round > 1 ? ` (${campaign.review_round}차 검수)` : ""}</div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{campaign.review_note}</p>
              {campaign.reviewed_at && <p className="mt-2 text-[11px] text-muted-foreground">{new Date(campaign.reviewed_at).toLocaleString("ko-KR")} 운영팀</p>}
            </div>
            {isOwner && (
              <Link href={`/dashboard/campaigns/${id}/edit`} className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background">
                <Pencil className="size-4" /> 수정 후 다시 검수 요청
              </Link>
            )}
          </div>
          {isOwner && <p className="mt-3 text-xs text-muted-foreground">위 사항을 반영해 저장하면 운영팀에 재검수 요청이 자동으로 전달됩니다. 문의는 contact@plander.io</p>}
        </section>
      )}

      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Stat
          icon={<MapPin className="size-4" />}
          label={tc.region}
          value={`${region.data?.flag ?? ""} ${region.data ? regionLabel(region.data, locale) : ""}`}
        />
        <Stat
          icon={<Tag className="size-4" />}
          label={tc.category}
          value={`${category.data?.emoji ?? ""} ${category.data ? categoryLabel(category.data, locale) : ""}`}
        />
        <Stat
          icon={<Users className="size-4" />}
          label={tc.recruitCount}
          value={tc.recruitValue(campaign.recruit_count)}
        />
        <Stat
          icon={<Coins className="size-4" />}
          label={tc.points}
          value={campaign.point_amount.toLocaleString()}
        />
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        {/* Left main */}
        <div className="space-y-4 lg:col-span-2">
          <Section title={tc.promotion}>
            <p className="text-sm font-medium">{promotion.data ? promotionTypeLabel(promotion.data, locale) : ""}</p>
            {promotion.data?.description && locale === "ko" && (
              <p className="mt-1 text-xs text-muted-foreground">{promotion.data.description}</p>
            )}
          </Section>

          <Section title={tc.missions}>
            {(missions.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">{tc.noMissions}</p>
            ) : (
              <div className="space-y-3">
                {(missions.data ?? []).map((m, i) => (
                  <div key={i} className="rounded-2xl bg-muted/50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {channelNameById.get(m.channel_type_id) ?? tc.channel}
                    </div>
                    <p className="mt-1 text-sm">{trMission.get(m.description) ?? m.description}</p>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title={tc.offerings}>
            {(offerings.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">{tc.noOfferings}</p>
            ) : (
              <ul className="space-y-2">
                {(offerings.data ?? []).map((o, i) => (
                  <li key={i} className="flex items-start justify-between gap-4 border-b border-border pb-2 last:border-0 last:pb-0">
                    <div>
                      <div className="text-sm font-medium">{trOffer.get(o.title)?.title ?? o.title}</div>
                      {o.description && (
                        <div className="mt-0.5 text-xs text-muted-foreground">{trOffer.get(o.title)?.description ?? o.description}</div>
                      )}
                    </div>
                    {o.estimated_value && (
                      <div className="shrink-0 text-sm tabular-nums">
                        {tc.won(o.estimated_value)}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {keywords.data && keywords.data.length > 0 && (
            <Section title={tc.keywords}>
              <div className="flex flex-wrap gap-2">
                {keywords.data.map((k, i) => (
                  <span
                    key={i}
                    className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground"
                  >
                    #{trKeyword.get(k.keyword) ?? k.keyword}
                  </span>
                ))}
              </div>
            </Section>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {isInfluencer && profile.approved && ["open", "closed"].includes(campaign.status) && (
            <FitHint campaignId={id} applicationStatus={myApplicationStatus} locale={locale} />
          )}
          <Section title={tc.recruitPeriod}>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="size-4 text-muted-foreground" />
              {fmtDateTime(campaign.recruit_start)}
            </div>
            <div className="mt-1 ml-6 text-xs text-muted-foreground">
              ~ {fmtDateTime(campaign.recruit_end)}
            </div>
          </Section>

          {(campaign.experience_start || campaign.experience_end) && (
            <Section title={tc.experiencePeriod}>
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
            <Section title={tc.options}>
              <div className="space-y-1.5 text-sm">
                {campaign.same_day_reservation && <div>{tc.sameDay}</div>}
                {campaign.always_open && <div>{tc.alwaysOpen}</div>}
              </div>
            </Section>
          )}

          {!campaign.always_open && (schedules.data ?? []).length > 0 && (
            <Section title={tc.schedule}>
              <ul className="space-y-1 text-sm">
                {(schedules.data ?? []).map((s, i) => (
                  <li key={i}>
                    {tc.weekdays[s.day_of_week ?? 0]}{tc.weekdaySuffix}{" "}
                    {s.start_time?.slice(0, 5) ?? ""} ~ {s.end_time?.slice(0, 5) ?? ""}
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      </div>

      {isOperator && <OperatorForceMatch campaignId={id} campaignStatus={campaign.status} />}
      {(isOwner || isOperator) && <ExternalResultsPanel campaignId={id} items={(externalResults ?? []) as ExternalResultItem[]} />}

      {/* Advertiser: AI influencer matching + applicants */}
      {isOwner && (
        <>
          {campaign.status === "open" && (
            <AdjustOpenCampaign
              campaignId={id}
              recruitEnd={campaign.recruit_end}
              recruitCount={campaign.recruit_count}
              alwaysOpen={campaign.always_open}
            />
          )}
          <Suspense fallback={<Skeleton className="mt-10 h-64 rounded-3xl" />}>
            <CampaignPerformance
              campaignId={id}
              recruitCount={campaign.recruit_count}
              recruitEnd={campaign.recruit_end}
              pointAmount={campaign.point_amount}
              status={campaign.status}
              reportToken={campaign.report_token}
              reportSummary={campaign.report_summary as ReportSummary | null}
              reportSummaryAt={campaign.report_summary_at}
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
                recruitCount={campaign.recruit_count}
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
