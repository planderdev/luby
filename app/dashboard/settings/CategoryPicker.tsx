"use client";

import { useState, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import { setMyCategories } from "./actions";

export type CategoryOption = { id: string; name: string; emoji: string | null };

const MAX = 3;

/**
 * 크리에이터 전문 분야 선택 (최대 3개). 칩을 누르면 즉시 저장.
 * 광고주 디렉터리 검색과 AI 매칭에 사용된다.
 */
export function CategoryPicker({
  categories,
  selected,
}: {
  categories: CategoryOption[];
  selected: string[];
}) {
  const [current, setCurrent] = useState<string[]>(selected);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function toggle(id: string) {
    const next = current.includes(id)
      ? current.filter((x) => x !== id)
      : current.length >= MAX
        ? current
        : [...current, id];
    if (next === current) {
      setError(`전문 분야는 최대 ${MAX}개까지 선택할 수 있어요.`);
      return;
    }
    const prev = current;
    setCurrent(next);
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const r = await setMyCategories(next);
      if (r.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
      } else {
        setCurrent(prev);
        setError(r.error);
      }
    });
  }

  return (
    <section className="rounded-3xl glass-card p-6 lg:p-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">전문 분야</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            최대 {MAX}개. 광고주가 크리에이터를 검색하거나 AI가 캠페인을 매칭할 때 사용돼요.
          </p>
        </div>
        <span className="text-xs text-muted-foreground">
          {pending ? (
            <span className="inline-flex items-center gap-1">
              <Loader2 className="size-3 animate-spin" /> 저장 중
            </span>
          ) : saved ? (
            <span className="inline-flex items-center gap-1 text-success">
              <Check className="size-3" /> 저장됨
            </span>
          ) : (
            `${current.length}/${MAX} 선택`
          )}
        </span>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {categories.map((c) => {
          const on = current.includes(c.id);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => toggle(c.id)}
              disabled={pending}
              aria-pressed={on}
              className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm transition-colors disabled:opacity-60 ${
                on
                  ? "border-accent bg-accent-soft font-medium text-accent-ink"
                  : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {c.emoji && <span>{c.emoji}</span>}
              {c.name}
              {on && <Check className="size-3.5" />}
            </button>
          );
        })}
      </div>

      {error && <p className="mt-3 text-xs text-danger">{error}</p>}
      {current.length === 0 && !error && (
        <p className="mt-3 text-xs text-warning">
          분야를 선택하지 않으면 광고주 검색에 잘 노출되지 않아요.
        </p>
      )}
    </section>
  );
}
