import Link from "next/link";
import { ArrowRight, Megaphone, TrendingUp, CreditCard } from "lucide-react";

type Plan = { name: string; tier: string; monthly_price: number } | null;

export function AdvertiserOverview({
  name,
  campaignCount,
  openCount,
  plan,
}: {
  name: string;
  campaignCount: number;
  openCount: number;
  plan: Plan;
}) {
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

      <div className="mt-10 rounded-3xl glass-card p-8">
        <h3 className="text-lg font-semibold">시작 가이드</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          첫 캠페인을 만들어 글로벌 인플루언서 풀에 노출하세요. 평균 7분이면 준비가 끝납니다.
        </p>
        <Link
          href="/dashboard/campaigns/new"
          className="mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-background px-5 py-2.5 text-sm font-medium hover:bg-muted"
        >
          캠페인 빌더 열기
          <ArrowRight className="size-4" />
        </Link>
      </div>
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
