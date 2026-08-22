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
import type { CompletenessItem } from "@/lib/profile-completeness";

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
}) {
  const todoItems: TodoItem[] = [
    {
      key: "invites",
      count: todo.pendingInvites,
      label: `광고주 초대 ${todo.pendingInvites}건이 응답을 기다려요`,
      hint: "수락하면 즉시 응모돼요 — 선정 확률이 높은 기회예요",
      href: "/dashboard/invitations",
      cta: "초대 보기",
      tone: "accent",
      icon: <Mail className="size-5" />,
    },
    {
      key: "revision",
      count: todo.revisionCount,
      label: `수정 요청된 콘텐츠 ${todo.revisionCount}건`,
      hint: "광고주 피드백을 반영해 다시 제출하세요",
      href: "/dashboard/applications",
      cta: "재제출",
      tone: "danger",
      icon: <MessageSquareWarning className="size-5" />,
    },
    {
      key: "submit",
      count: todo.needSubmitCount,
      label: `선정된 캠페인 ${todo.needSubmitCount}건의 콘텐츠를 제출하세요`,
      hint: "체험 후 콘텐츠 URL을 올리면 검수 뒤 포인트가 지급돼요",
      href: "/dashboard/applications",
      cta: "제출하기",
      tone: "warning",
      icon: <Upload className="size-5" />,
    },
    {
      key: "messages",
      count: todo.unreadMessages,
      label: `안 읽은 메시지 ${todo.unreadMessages}개`,
      hint: "광고주가 일정·안내를 보냈어요",
      href: "/dashboard/messages",
      cta: "확인하기",
      tone: "accent",
      icon: <MessageSquare className="size-5" />,
    },
    {
      key: "new",
      count: todo.newCampaigns,
      label: `이번 주 새로 열린 캠페인 ${todo.newCampaigns}개`,
      hint: "내 업종·지역에 맞는 캠페인을 골라 응모하세요",
      href: "/dashboard/campaigns",
      cta: "둘러보기",
      tone: "neutral",
      icon: <Sparkles className="size-5" />,
    },
  ];

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            인플루언서 대시보드
          </p>
          <h1 className="display mt-2 text-3xl font-semibold lg:text-4xl">
            {name}님, 환영해요.
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">활동 지역 · {region}</p>
        </div>
        <Link
          href="/dashboard/campaigns"
          className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background"
        >
          캠페인 둘러보기
          <ArrowRight className="size-4" />
        </Link>
      </header>

      {!approved && (
        <div className="mt-8 flex items-start gap-4 rounded-3xl border border-accent/30 bg-accent-soft px-6 py-5 text-accent-ink">
          <Clock className="mt-0.5 size-5 shrink-0" />
          <div className="text-sm">
            <div className="font-semibold">계정 승인 대기 중입니다</div>
            <div className="mt-1 text-accent-ink/80">
              운영자가 인플루언서 정보를 검수하고 있어요. 평균 24시간 이내 결과를 알려드립니다. 그
              사이에 캠페인 둘러보기는 자유롭게 가능합니다.
            </div>
          </div>
        </div>
      )}

      <div className="mt-10 grid gap-4 md:grid-cols-4">
        <StatCard
          icon={<Inbox className="size-5" />}
          label="응모 누적"
          value={applicationCount.toString()}
          hint="총 응모"
        />
        <StatCard
          icon={<Star className="size-5" />}
          label="선정"
          value={selectedCount.toString()}
          hint="현재 진행"
        />
        <StatCard
          icon={<Coins className="size-5" />}
          label="포인트"
          value={totalPoints.toLocaleString()}
          hint="누적"
        />
        <StatCard
          icon={<Users className="size-5" />}
          label="내 추천 가입"
          value={referrals.toString()}
          hint={referrals > 0 ? "친구가 첫 체험을 완료하면 500P" : "친구 초대 → 첫 체험 완료 시 500P"}
        />
      </div>

      {completeness && completeness.percent < 100 && (
        <div className="mt-8">
          <CompletenessCard {...completeness} compact />
        </div>
      )}

      {approved && <TodoList items={todoItems} />}

      {approved && recommended.length > 0 && (
        <section className="mt-10">
          <div className="flex items-baseline justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">내게 맞는 캠페인</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                내 전문 분야·활동 지역과 맞는 순으로 골랐어요
              </p>
            </div>
            <Link
              href="/dashboard/campaigns"
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              전체 보기 <ArrowUpRight className="size-3.5" />
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
                  <img src={c.thumbnail_url ?? `/api/og/campaign/${c.id}`} alt={c.title} loading="lazy" className={`size-full object-cover ${c.thumbnail_url ? "" : "object-left"}`} />
                  {c.badges.length > 0 && (
                    <div className="absolute right-2 top-2 flex gap-1">
                      {c.badges.map((b) => (
                        <span key={b} className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-white shadow-pink-sm">
                          {b}
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
                      {c.recruit_count}명
                    </span>
                    <span>~{new Date(c.recruit_end).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })}</span>
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
