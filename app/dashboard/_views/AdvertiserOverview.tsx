import Link from "next/link";
import {
  ArrowRight,
  Megaphone,
  TrendingUp,
  CreditCard,
  Inbox,
  ClipboardCheck,
  MessageSquare,
  Timer,
  FileEdit,
  Sparkles,
} from "lucide-react";
import { TodoList, type TodoItem } from "@/components/dashboard/TodoList";
import { CompletenessCard } from "@/components/dashboard/CompletenessCard";
import type { CompletenessItem } from "@/lib/profile-completeness";

type Plan = { name: string; tier: string; monthly_price: number } | null;

type AdvertiserTodo = {
  pendingApplicants: number;
  submittedCount: number;
  unreadMessages: number;
  closingSoonCount: number;
  draftCount: number;
  /** null = FREE 또는 만료일 없음 */
  daysToExpire: number | null;
};

export function AdvertiserOverview({
  name,
  campaignCount,
  openCount,
  plan,
  todo,
  completeness,
}: {
  name: string;
  campaignCount: number;
  openCount: number;
  plan: Plan;
  todo: AdvertiserTodo;
  completeness?: { percent: number; items: CompletenessItem[]; next: CompletenessItem | null };
}) {
  const todoItems: TodoItem[] = [
    {
      key: "applicants",
      count: todo.pendingApplicants,
      label: `응모자 ${todo.pendingApplicants}명이 선정을 기다려요`,
      hint: "프로필을 보고 선정/미선정을 결정하세요",
      href: "/dashboard/applications",
      cta: "응모자 보기",
      tone: "accent",
      icon: <Inbox className="size-5" />,
    },
    {
      key: "submissions",
      count: todo.submittedCount,
      label: `콘텐츠 ${todo.submittedCount}건이 검수를 기다려요`,
      hint: "AI 사전 검수로 빠르게 확인하고 승인하면 포인트가 지급돼요",
      href: "/dashboard/applications",
      cta: "검수하기",
      tone: "warning",
      icon: <ClipboardCheck className="size-5" />,
    },
    {
      key: "messages",
      count: todo.unreadMessages,
      label: `안 읽은 메시지 ${todo.unreadMessages}개`,
      hint: "크리에이터가 답장을 기다리고 있어요",
      href: "/dashboard/messages",
      cta: "답장하기",
      tone: "accent",
      icon: <MessageSquare className="size-5" />,
    },
    {
      key: "closing",
      count: todo.closingSoonCount,
      label: `모집 마감 3일 이내 캠페인 ${todo.closingSoonCount}개`,
      hint: "마감 전에 응모자 선정을 마무리하세요",
      href: "/dashboard/campaigns?status=open&sort=deadline",
      cta: "캠페인 보기",
      tone: "warning",
      icon: <Timer className="size-5" />,
    },
    {
      key: "expire",
      count: todo.daysToExpire !== null && todo.daysToExpire <= 7 ? 1 : 0,
      label:
        todo.daysToExpire !== null && todo.daysToExpire <= 0
          ? "구독이 만료됐어요 — FREE로 전환됨"
          : `구독이 ${todo.daysToExpire}일 후 만료돼요`,
      hint: "지금 갱신하면 남은 기간에 이어서 30일 연장",
      href: "/dashboard/billing",
      cta: "갱신하기",
      tone: "danger",
      icon: <CreditCard className="size-5" />,
    },
    {
      key: "drafts",
      count: todo.draftCount,
      label: `작성 중인 초안 ${todo.draftCount}개`,
      hint: "마무리하고 검수 요청을 보내세요",
      href: "/dashboard/campaigns?status=draft",
      cta: "이어서 작성",
      tone: "neutral",
      icon: <FileEdit className="size-5" />,
    },
  ];

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">광고주 대시보드</p>
          <h1 className="display mt-2 text-3xl font-semibold lg:text-4xl">
            {name}님, 환영해요.
          </h1>
        </div>
        <Link
          href="/dashboard/campaigns/new"
          className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background transition-transform hover:scale-[1.02]"
        >
          새 캠페인 만들기
          <ArrowRight className="size-4" />
        </Link>
      </header>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        <StatCard
          icon={<Megaphone className="size-5" />}
          label="등록 캠페인"
          value={campaignCount.toString()}
          hint="누적"
        />
        <StatCard
          icon={<TrendingUp className="size-5" />}
          label="모집중"
          value={openCount.toString()}
          hint="현재 오픈"
        />
        <StatCard
          icon={<CreditCard className="size-5" />}
          label="현재 플랜"
          value={plan?.name ?? "FREE"}
          hint={plan ? `${plan.monthly_price.toLocaleString()}원/월` : ""}
        />
      </div>

      {completeness && completeness.percent < 100 && (
        <div className="mt-8">
          <CompletenessCard {...completeness} compact title="회사 프로필 완성도" doneText="완성! 크리에이터가 브랜드를 신뢰하고 응모해요" todoText="채울수록 응모율·선정 품질이 올라가요" />
        </div>
      )}

      <TodoList items={todoItems} />

      {campaignCount === 0 && (
        <div className="mt-10 rounded-3xl glass-card p-8">
          <div className="flex items-center gap-2 text-accent-ink">
            <Sparkles className="size-4" />
            <h3 className="text-lg font-semibold text-foreground">시작 가이드</h3>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            첫 캠페인을 만들어 글로벌 인플루언서 풀에 노출하세요. 업종 한 줄만 적으면 AI가
            제목·미션·혜택까지 초안을 완성해요. 평균 7분이면 준비가 끝납니다.
          </p>
          <Link
            href="/dashboard/campaigns/new"
            className="mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-background px-5 py-2.5 text-sm font-medium hover:bg-muted"
          >
            캠페인 빌더 열기
            <ArrowRight className="size-4" />
          </Link>
        </div>
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
