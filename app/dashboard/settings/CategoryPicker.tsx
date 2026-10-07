"use client";

import { useState, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import { setMyCategories } from "./actions";
import { categoryLabel } from "@/lib/i18n/app/catalog";
import { dashboardDict } from "@/lib/i18n/app/dashboard";
import type { Locale } from "@/lib/i18n/config";

export type CategoryOption = { id: string; slug?: string | null; name: string; emoji: string | null };

const MAX = 3;

/**
 * 크리에이터 전문 분야 선택 (최대 3개). 칩을 누르면 즉시 저장.
 * 광고주 디렉터리 검색과 AI 매칭에 사용된다.
 */
export function CategoryPicker({
  categories,
  selected,
  locale = "ko",
}: {
  categories: CategoryOption[];
  selected: string[];
  locale?: Locale;
}) {
  const t = dashboardDict[locale].settings.categories;
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
      setError(t.max(MAX));
      return;
    }
    const prev = current;
    setCurrent(next);
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const r = await setMyCategories(next, locale);
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
    <section id="categories" className="scroll-mt-24 rounded-3xl glass-card p-6 lg:p-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{t.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t.desc(MAX)}
          </p>
        </div>
        <span className="text-xs text-muted-foreground">
          {pending ? (
            <span className="inline-flex items-center gap-1">
              <Loader2 className="size-3 animate-spin" /> {dashboardDict[locale].settings.saving}
            </span>
          ) : saved ? (
            <span className="inline-flex items-center gap-1 text-success">
              <Check className="size-3" /> {dashboardDict[locale].settings.saved}
            </span>
          ) : (
            t.count(current.length, MAX)
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
              {categoryLabel(c, locale)}
              {on && <Check className="size-3.5" />}
            </button>
          );
        })}
      </div>

      {error && <p className="mt-3 text-xs text-danger">{error}</p>}
      {current.length === 0 && !error && (
        <p className="mt-3 text-xs text-warning">
          {t.none}
        </p>
      )}
    </section>
  );
}
