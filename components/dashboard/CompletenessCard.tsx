import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import type { CompletenessItem } from "@/lib/profile-completeness";

export function CompletenessCard({
  percent,
  items,
  next,
  compact = false,
}: {
  percent: number;
  items: CompletenessItem[];
  next: CompletenessItem | null;
  compact?: boolean;
}) {
  const done = percent >= 100;
  return (
    <section className={`rounded-3xl ${done ? "glass-card" : "border border-accent/30 bg-accent-soft/40"} p-6 lg:p-8`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">프로필 완성도</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="display text-3xl font-semibold">{percent}%</span>
            <span className="text-xs text-muted-foreground">
              {done ? "완성! 광고주 검색·AI 매칭에 최대로 노출돼요" : "완성할수록 추천·초대가 늘어요"}
            </span>
          </div>
        </div>
        {next && (
          <Link
            href={next.href}
            className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-xs font-medium text-background"
          >
            다음: {next.label} <ArrowUpRight className="size-3.5" />
          </Link>
        )}
      </div>
      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-background/70">
        <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${percent}%` }} />
      </div>
      {!compact && (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {items.map((it) => (
            <li key={it.key} className="flex items-start gap-2 text-sm">
              <span
                className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full ${
                  it.done ? "bg-success text-white" : "border border-border bg-background"
                }`}
              >
                {it.done && <Check className="size-3" />}
              </span>
              <span className={it.done ? "text-muted-foreground line-through" : ""}>
                {it.label}
                {!it.done && <span className="ml-1 text-xs text-muted-foreground">· {it.hint}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
