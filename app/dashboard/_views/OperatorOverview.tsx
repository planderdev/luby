import Link from "next/link";
import { ArrowRight, Users, ShieldCheck } from "lucide-react";

export function OperatorOverview({
  name,
  pendingUsersCount,
  pendingCampaignsCount,
}: {
  name: string;
  pendingUsersCount: number;
  pendingCampaignsCount: number;
}) {
  return (
    <div>
      <header>
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">운영자 대시보드</p>
        <h1 className="display mt-2 text-3xl font-semibold lg:text-4xl">
          {name}님, 검수 작업이 기다립니다.
        </h1>
      </header>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <ActionCard
          icon={<Users className="size-5" />}
          label="회원 승인 대기"
          value={pendingUsersCount.toString()}
          href="/dashboard/operator/users"
          cta="검수 시작"
        />
        <ActionCard
          icon={<ShieldCheck className="size-5" />}
          label="캠페인 승인 대기"
          value={pendingCampaignsCount.toString()}
          href="/dashboard/operator/campaigns"
          cta="검수 시작"
        />
      </div>
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
