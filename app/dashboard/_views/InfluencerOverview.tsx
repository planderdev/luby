import Link from "next/link";
import {
  ArrowRight,
  Inbox,
  Star,
  Coins,
  Clock,
  Upload,
  MessageSquareWarning,
  MessageSquare,
  Sparkles,
  Mail,
  Users,
  ArrowUpRight,
} from "lucide-react";
import { TodoList, type TodoItem } from "@/components/dashboard/TodoList";
import { CompletenessCard } from "@/components/dashboard/CompletenessCard";
import { ReferralCard } from "@/components/dashboard/ReferralCard";
import type { CompletenessItem } from "@/lib/profile-completeness";
import { dashboardDict } from "@/lib/i18n/app/dashboard";
import { withLang } from "@/lib/i18n/app-locale-shared";
import type { Locale } from "@/lib/i18n/config";

export type RecommendedCampaign = {
  id: string;
  title: string;
  business_name: string;
  thumbnail_url: string | null;
  point_amount: number;
  recruit_end: string;
  recruit_count: number;
  badges: string[];
  categoryEmoji: string;
  categoryName: string;
};

type InfluencerTodo = {
  needSubmitCount: number;
  revisionCount: number;
  unreadMessages: number;
  newCampaigns: number;
  pendingInvites: number;
};

export function InfluencerOverview({
  name,
  approved,
  applicationCount,
  selectedCount,
  totalPoints,
  region,
  todo,
  recommended = [],
  completeness,
  referrals = 0,
  referralStats,
  profileId,
  locale = "ko",
}: {
  name: string;
  approved: boolean;
  applicationCount: number;
  selectedCount: number;
  totalPoints: number;
  region: string;
  todo: InfluencerTodo;
  recommended?: RecommendedCampaign[];
  completeness?: { percent: number; items: CompletenessItem[]; next: CompletenessItem | null };
  /** 내 공유 링크로 가입한 사람 수 */
  referrals?: number;
  referralStats?: { total: number; rewarded: number; rewardPoints: number; monthRewarded: number };
  profileId?: string;
  locale?: Locale;
}) {
  const t = dashboardDict[locale].overview;
  const badgeLabel = dashboardDict[locale].list.badges;
  const todoItems: TodoItem[] = [
    {
      key: "invites",
      count: todo.pendingInvites,
      label: t.todo.invites(todo.pendingInvites),
      hint: t.todo.invitesHint,
      href: "/dashboard/invitations",
      cta: t.todo.invitesCta,
      tone: "accent",
      icon: <Mail className="size-5" />,
    },
    {
      key: "revision",
      count: todo.revisionCount,
      label: t.todo.revision(todo.revisionCount),
      hint: t.todo.revisionHint,
      href: "/dashboard/applications",
      cta: t.todo.revisionCta,
      tone: "danger",
      icon: <MessageSquareWarning className="size-5" />,
    },
    {
      key: "submit",
      count: todo.needSubmitCount,
      label: t.todo.submit(todo.needSubmitCount),
      hint: t.todo.submitHint,
      href: "/dashboard/applications",
      cta: t.todo.submitCta,
      tone: "warning",
      icon: <Upload className="size-5" />,
    },
    {
      key: "messages",
      count: todo.unreadMessages,
      label: t.todo.messages(todo.unreadMessages),
      hint: t.todo.messagesHint,
      href: "/dashboard/messages",
      cta: t.todo.messagesCta,
      tone: "accent",
      icon: <MessageSquare className="size-5" />,
    },
    {
      key: "new",
      count: todo.newCampaigns,
      label: t.todo.newCampaigns(todo.newCampaigns),
      hint: t.todo.newCampaignsHint,
      href: "/dashboard/campaigns",
      cta: t.todo.newCampaignsCta,
      tone: "neutral",
      icon: <Sparkles className="size-5" />,
    },
  ];

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {t.eyebrow}
          </p>
          <h1 className="display mt-2 text-3xl font-semibold lg:text-4xl">
            {t.welcome(name)}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{t.regionLine(region)}</p>
        </div>
        <Link
          href="/dashboard/campaigns"
          className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background"
        >
          {t.browse}
          <ArrowRight className="size-4" />
        </Link>
      </header>

      {!approved && (() => {
        // 승인은 채널 검수로 진행된다 — 채널이 없으면 검수 자체가 시작되지 않으므로 그것부터 안내
        const hasChannel = completeness?.items.find((i) => i.key === "channel")?.done ?? true;
        return hasChannel ? (
          <div className="mt-8 flex items-start gap-4 rounded-3xl border border-accent/30 bg-accent-soft px-6 py-5 text-accent-ink">
            <Clock className="mt-0.5 size-5 shrink-0" />
            <div className="text-sm">
              <div className="font-semibold">{t.pendingTitle}</div>
              <div className="mt-1 text-accent-ink/80">{t.pendingBody}</div>
            </div>
          </div>
        ) : (
          <div className="mt-8 flex flex-wrap items-start gap-4 rounded-3xl border border-accent/30 bg-accent-soft px-6 py-5 text-accent-ink">
            <Clock className="mt-0.5 size-5 shrink-0" />
            <div className="min-w-0 flex-1 text-sm">
              <div className="font-semibold">{t.needChannelTitle}</div>
              <div className="mt-1 text-accent-ink/80">{t.needChannelBody}</div>
            </div>
            <Link
              href="/dashboard/settings#channels"
              className="shrink-0 rounded-full bg-foreground px-4 py-2 text-xs font-medium text-background"
            >
              {t.addChannel}
            </Link>
          </div>
        );
      })()}

      <div className="mt-10 grid gap-4 md:grid-cols-4">
        <StatCard
          icon={<Inbox className="size-5" />}
          label={t.stApplied}
          value={applicationCount.toString()}
          hint={t.stAppliedHint}
        />
        <StatCard
          icon={<Star className="size-5" />}
          label={t.stSelected}
          value={selectedCount.toString()}
          hint={t.stSelectedHint}
        />
        <StatCard
          icon={<Coins className="size-5" />}
          label={t.stPoints}
          value={totalPoints.toLocaleString()}
          hint={t.stPointsHint}
        />
        <StatCard
          icon={<Users className="size-5" />}
          label={t.stReferrals}
          value={referrals.toString()}
          hint={referrals > 0 ? t.stReferralsHintSome : t.stReferralsHintNone}
        />
      </div>

      {approved && profileId && referralStats && (
        <ReferralCard profileId={profileId} {...referralStats} labels={t.referral} />
      )}

      {completeness && completeness.percent < 100 && (
        <div className="mt-8">
          <CompletenessCard {...completeness} compact title={t.completeness.title} doneText={t.completeness.doneText} todoText={t.completeness.todoText} nextText={t.completeness.next} itemLabels={t.completeness.items} />
        </div>
      )}

      {approved && <TodoList items={todoItems} title={t.todo.title} countText={t.todo.count} emptyText={t.todo.empty} />}

      {approved && recommended.length > 0 && (
        <section className="mt-10">
          <div className="flex items-baseline justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">{t.recTitle}</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">{t.recSubtitle}</p>
            </div>
            <Link
              href="/dashboard/campaigns"
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              {t.seeAll} <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {recommended.map((c) => (
              <Link
                key={c.id}
                href={`/dashboard/campaigns/${c.id}`}
                className="group flex flex-col overflow-hidden rounded-2xl glass-card transition-colors hover:bg-muted/40"
              >
                <div className="relative aspect-[16/9] w-full bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.thumbnail_url ?? withLang(`/api/og/campaign/${c.id}`, locale)} alt={c.title} loading="lazy" className={`size-full object-cover ${c.thumbnail_url ? "" : "object-left"}`} />
                  {c.badges.length > 0 && (
                    <div className="absolute right-2 top-2 flex gap-1">
                      {c.badges.map((b) => (
                        <span key={b} className="rounded-full bg-accent-strong px-2 py-0.5 text-[10px] font-semibold text-white shadow-pink-sm">
                          {badgeLabel[b] ?? b}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    {c.categoryEmoji} {c.categoryName} · {c.business_name}
                  </div>
                  <h3 className="mt-1.5 line-clamp-2 text-sm font-semibold group-hover:underline underline-offset-2">
                    {c.title}
                  </h3>
                  <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Users className="size-3.5" />
                      {t.recruit(c.recruit_count)}
                    </span>
                    <span>~{new Date(c.recruit_end).toLocaleDateString(t.dateLocale, { month: "numeric", day: "numeric" })}</span>
                    {c.point_amount > 0 && (
                      <span className="ml-auto inline-flex items-center gap-1 font-semibold text-accent-ink">
                        <Coins className="size-3.5" />
                        {c.point_amount.toLocaleString()}P
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-3xl glass-card p-6">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
        <span className="flex size-9 items-center justify-center rounded-xl bg-accent-soft text-accent-ink">
          {icon}
        </span>
      </div>
      <div className="display mt-5 text-3xl font-semibold">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
