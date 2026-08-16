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
} from "lucide-react";
import { TodoList, type TodoItem } from "@/components/dashboard/TodoList";

type InfluencerTodo = {
  needSubmitCount: number;
  revisionCount: number;
  unreadMessages: number;
  newCampaigns: number;
};

export function InfluencerOverview({
  name,
  approved,
  applicationCount,
  selectedCount,
  totalPoints,
  region,
  todo,
}: {
  name: string;
  approved: boolean;
  applicationCount: number;
  selectedCount: number;
  totalPoints: number;
  region: string;
  todo: InfluencerTodo;
}) {
  const todoItems: TodoItem[] = [
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

      <div className="mt-10 grid gap-4 md:grid-cols-3">
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
      </div>

      {approved && <TodoList items={todoItems} />}
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
