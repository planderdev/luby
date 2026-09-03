"use client";

import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";

type Notice = { id: string; title: string; image_url: string; link_url: string | null };

const HIDE_KEY = (id: string) => `luby:notice-hidden:${id}`;

/** "오늘 하루 보지 않기" — 다음 날 자정까지 숨긴다 */
function hideForToday(id: string) {
  try {
    const until = new Date();
    until.setHours(24, 0, 0, 0);
    localStorage.setItem(HIDE_KEY(id), String(until.getTime()));
  } catch {
    /* 저장이 막혀 있으면 이번 방문에만 닫힌다 */
  }
}

function isHidden(id: string) {
  try {
    const v = localStorage.getItem(HIDE_KEY(id));
    if (!v) return false;
    if (Number(v) > Date.now()) return true;
    localStorage.removeItem(HIDE_KEY(id));
    return false;
  } catch {
    return false;
  }
}

const LABELS = {
  ko: { close: "닫기", today: "오늘 하루 보지 않기", notice: "공지" },
  en: { close: "Close", today: "Don't show today", notice: "Notice" },
  zh: { close: "关闭", today: "今日不再显示", notice: "公告" },
} as const;

/**
 * 메인 랜딩 공지 팝업.
 *
 * 랜딩을 정적으로 두기 위해 데이터는 하이드레이션 이후 /api/notices 로 가져온다.
 * 기간이 겹치는 팝업은 전부 나란히(모바일은 세로로) 보여준다.
 */
export function NoticePopups({ locale = "ko" }: { locale?: "ko" | "en" | "zh" }) {
  const t = LABELS[locale];
  const [items, setItems] = useState<Notice[]>([]);

  useEffect(() => {
    let alive = true;
    fetch("/api/notices")
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d: { items?: Notice[] }) => {
        if (!alive) return;
        setItems((d.items ?? []).filter((n) => !isHidden(n.id)));
      })
      .catch(() => {
        /* 팝업은 없어도 그만 */
      });
    return () => {
      alive = false;
    };
  }, []);

  const dismiss = useCallback((id: string, today: boolean) => {
    if (today) hideForToday(id);
    setItems((prev) => prev.filter((n) => n.id !== id));
  }, []);

  useEffect(() => {
    if (items.length === 0) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setItems([]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [items.length]);

  if (items.length === 0) return null;

  return (
    <>
      {/* 배경 딤은 데스크톱에서만. 모바일은 아래에서 올라오는 카드로 두어 본문을 가리지 않는다
          (모바일 전면 팝업은 구글이 '침입형 인터스티셜'로 보고 검색 순위에서 감점한다) */}
      <button
        type="button"
        aria-label={t.close}
        onClick={() => setItems([])}
        className="fixed inset-0 z-[2500] hidden bg-black/50 backdrop-blur-[2px] sm:block"
      />
      <div
        role="dialog"
        aria-modal="false"
        aria-label={t.notice}
        className="fixed inset-x-0 bottom-0 z-[2600] flex max-h-[85dvh] flex-col items-center gap-3 overflow-y-auto px-4 pb-4 sm:inset-0 sm:justify-center sm:overflow-visible sm:p-6"
      >
      <div className="flex w-full max-w-5xl flex-col items-center gap-3 sm:flex-row sm:items-start sm:justify-center">
        {items.map((n) => {
          const image = (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={n.image_url} alt={n.title} className="block h-auto w-full" loading="eager" />
          );
          return (
            <div
              key={n.id}
              className="w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
            >
              {n.link_url ? (
                <a href={n.link_url} target="_blank" rel="noopener noreferrer" aria-label={n.title}>
                  {image}
                </a>
              ) : (
                image
              )}
              <div className="flex items-center justify-between border-t border-border bg-background">
                <button
                  type="button"
                  onClick={() => dismiss(n.id, true)}
                  className="px-4 py-3 text-xs text-muted-foreground hover:text-foreground"
                >
                  {t.today}
                </button>
                <button
                  type="button"
                  onClick={() => dismiss(n.id, false)}
                  aria-label={t.close}
                  className="inline-flex items-center gap-1 px-4 py-3 text-xs font-medium hover:text-accent-ink"
                >
                  {t.close} <X className="size-3.5" />
                </button>
              </div>
            </div>
          );
          })}
        </div>
      </div>
    </>
  );
}
