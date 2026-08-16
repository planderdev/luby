import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

export type TodoTone = "danger" | "warning" | "accent" | "neutral";

export type TodoItem = {
  /** 고유 키 */
  key: string;
  /** 표시할 개수 (0이면 목록에서 제외됨) */
  count: number;
  /** "응모자 N명이 선정을 기다려요" 처럼 count가 들어간 문장 */
  label: string;
  hint?: string;
  href: string;
  cta: string;
  tone?: TodoTone;
  icon: React.ReactNode;
};

const TONE: Record<TodoTone, { chip: string; iconWrap: string }> = {
  danger: { chip: "bg-danger-soft text-danger", iconWrap: "bg-danger-soft text-danger" },
  warning: { chip: "bg-warning-soft text-warning", iconWrap: "bg-warning-soft text-warning" },
  accent: { chip: "bg-accent-soft text-accent-ink", iconWrap: "bg-accent-soft text-accent-ink" },
  neutral: { chip: "bg-muted text-foreground", iconWrap: "bg-muted text-foreground" },
};

/**
 * 역할별 "오늘 할 일" 액션 센터. count가 0인 항목은 자동으로 숨긴다.
 * 모두 0이면 "밀린 일이 없어요" 상태를 보여준다.
 */
export function TodoList({ items, title = "오늘 할 일" }: { items: TodoItem[]; title?: string }) {
  const active = items.filter((i) => i.count > 0);

  return (
    <section className="mt-10">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {active.length > 0 && (
          <span className="text-xs text-muted-foreground">{active.length}건</span>
        )}
      </div>

      {active.length === 0 ? (
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-dashed border-border px-5 py-5 text-sm text-muted-foreground">
          <CheckCircle2 className="size-5 shrink-0 text-success" />
          밀린 일이 없어요. 모두 처리됐습니다.
        </div>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {active.map((item) => {
            const tone = TONE[item.tone ?? "neutral"];
            return (
              <Link
                key={item.key}
                href={item.href}
                className="group flex items-center gap-4 rounded-2xl glass-card px-5 py-4 transition-colors hover:bg-muted/40"
              >
                <span
                  className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${tone.iconWrap}`}
                >
                  {item.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-xs font-bold ${tone.chip}`}
                    >
                      {item.count > 99 ? "99+" : item.count}
                    </span>
                    <span className="truncate text-sm font-medium">{item.label}</span>
                  </div>
                  {item.hint && (
                    <p className="mt-1 truncate text-xs text-muted-foreground">{item.hint}</p>
                  )}
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground group-hover:text-foreground">
                  {item.cta}
                  <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
