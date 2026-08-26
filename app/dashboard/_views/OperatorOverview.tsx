import Link from "next/link";
import { ArrowRight, Users, ShieldCheck, Banknote, Megaphone, MailWarning } from "lucide-react";
import { TodoList, type TodoItem } from "@/components/dashboard/TodoList";

export function OperatorOverview({
  name,
  pendingUsersCount,
  pendingCampaignsCount,
  pendingWithdrawals,
  openCampaigns,
  dormantCount = 0,
}: {
  name: string;
  pendingUsersCount: number;
  pendingCampaignsCount: number;
  pendingWithdrawals: number;
  openCampaigns: number;
  /** 초대만 되고 한 번도 로그인하지 않은 실계정 수 (데모 제외) */
  dormantCount?: number;
}) {
  const totalPending = pendingUsersCount + pendingCampaignsCount + pendingWithdrawals + dormantCount;

  const todoItems: TodoItem[] = [
    {
      key: "users",
      count: pendingUsersCount,
      label: `크리에이터 ${pendingUsersCount}명이 가입 승인을 기다려요`,
      hint: "채널·프로필을 확인하고 승인하면 응모를 시작할 수 있어요",
      href: "/dashboard/operator/users",
      cta: "승인하기",
      tone: "accent",
      icon: <Users className="size-5" />,
    },
    {
      key: "campaigns",
      count: pendingCampaignsCount,
      label: `캠페인 ${pendingCampaignsCount}개가 검수를 기다려요`,
      hint: "승인하면 즉시 크리에이터에게 노출돼요",
      href: "/dashboard/operator/campaigns",
      cta: "검수하기",
      tone: "warning",
      icon: <ShieldCheck className="size-5" />,
    },
    {
      key: "withdrawals",
      count: pendingWithdrawals,
      label: `정산 요청 ${pendingWithdrawals}건이 처리를 기다려요`,
      hint: "계좌 확인 후 지급 처리하거나 반려하세요",
      href: "/dashboard/operator/withdrawals",
      cta: "정산하기",
      tone: "danger",
      icon: <Banknote className="size-5" />,
    },
    {
      key: "dormant",
      count: dormantCount,
      label: `${dormantCount}명이 초대 후 한 번도 들어오지 않았어요`,
      hint: "초대 메일을 다시 보내면 비밀번호를 정하고 바로 시작할 수 있어요",
      href: "/dashboard/operator/users?filter=never",
      cta: "다시 초대하기",
      tone: "accent",
      icon: <MailWarning className="size-5" />,
    },
  ];

  return (
    <div>
      <header>
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">운영자 대시보드</p>
        <h1 className="display mt-2 text-3xl font-semibold lg:text-4xl">
          {name}님,{" "}
          {totalPending > 0 ? `처리할 작업 ${totalPending}건이 있어요.` : "밀린 작업이 없어요."}
        </h1>
      </header>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <ActionCard
          icon={<Megaphone className="size-5" />}
          label="모집중 캠페인"
          value={openCampaigns.toString()}
          href="/dashboard/operator/campaigns?status=open"
          cta="전체 보기"
        />
        <ActionCard
          icon={<ShieldCheck className="size-5" />}
          label="플랫폼 통계"
          value="→"
          href="/dashboard/operator/stats"
          cta="열기"
        />
      </div>

      <TodoList items={todoItems} title="처리 대기" />
    </div>
  );
}

function ActionCard({
  icon,
  label,
  value,
  href,
  cta,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href: string;
  cta: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-6 rounded-3xl glass-card p-6 transition-colors hover:bg-muted/50"
    >
      <span className="flex size-12 items-center justify-center rounded-2xl bg-accent-soft text-accent-ink">
        {icon}
      </span>
      <div className="flex-1">
        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
        <div className="display mt-2 text-3xl font-semibold">{value}</div>
      </div>
      <span className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground group-hover:text-foreground">
        {cta}
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
