import Link from "next/link";
import { ArrowRight, Inbox, Star, Coins, Clock } from "lucide-react";

export function InfluencerOverview({
  name,
  approved,
  applicationCount,
  selectedCount,
  totalPoints,
  region,
}: {
  name: string;
  approved: boolean;
  applicationCount: number;
  selectedCount: number;
  totalPoints: number;
  region: string;
}) {
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
