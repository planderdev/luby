"use client";

import { useState, useTransition } from "react";
import { CalendarPlus, Check, Loader2, UserPlus } from "lucide-react";
import { adjustOpenCampaign } from "./actions";

/** 모집중 캠페인: 마감 연장·인원 증원 패널 (그 외 필드는 모집중에는 잠금) */
export function AdjustOpenCampaign({
  campaignId,
  recruitEnd,
  recruitCount,
  alwaysOpen,
}: {
  campaignId: string;
  recruitEnd: string;
  recruitCount: number;
  alwaysOpen: boolean;
}) {
  const currentEndLocal = new Date(recruitEnd).toISOString().slice(0, 16);
  const [open, setOpen] = useState(false);
  const [end, setEnd] = useState(currentEndLocal);
  const [count, setCount] = useState(recruitCount);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const r = await adjustOpenCampaign(campaignId, {
        recruitEnd: end !== currentEndLocal ? end : undefined,
        recruitCount: count !== recruitCount ? count : undefined,
      });
      if (!r.ok) setError(r.error);
      else {
        setSaved(true);
        setOpen(false);
      }
    });
  }

  return (
    <section className="mt-6 rounded-3xl border border-border bg-muted/30 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">모집 연장 · 인원 추가</div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            모집중에는 마감 연장과 인원 증원만 가능합니다. 내용 수정이 필요하면 캠페인을 취소 후 복제해 다시 검수를 받아주세요.
          </p>
        </div>
        {saved && !open ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-3 py-1.5 text-xs font-medium text-success">
            <Check className="size-3.5" /> 반영되었습니다
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="rounded-full border border-border px-4 py-2 text-xs font-medium hover:bg-muted"
          >
            {open ? "접기" : "조정하기"}
          </button>
        )}
      </div>
      {open && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {!alwaysOpen && (
            <label className="block">
              <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <CalendarPlus className="size-3.5" /> 모집 마감 (연장만 가능)
              </span>
              <input
                type="datetime-local"
                value={end}
                min={currentEndLocal}
                onChange={(e) => setEnd(e.target.value)}
                className="mt-1.5 w-full rounded-2xl border border-border bg-background px-4 py-2.5 text-sm"
              />
            </label>
          )}
          <label className="block">
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <UserPlus className="size-3.5" /> 모집 인원 (현재 {recruitCount}명, 증원만 가능)
            </span>
            <input
              type="number"
              value={count}
              min={recruitCount}
              max={1000}
              onChange={(e) => setCount(Number(e.target.value))}
              className="mt-1.5 w-full rounded-2xl border border-border bg-background px-4 py-2.5 text-sm"
            />
          </label>
          <div className="sm:col-span-2 flex items-center justify-end gap-2">
            {error && <p className="mr-auto text-xs text-danger">{error}</p>}
            <button
              type="button"
              onClick={submit}
              disabled={pending || (end === currentEndLocal && count === recruitCount)}
              className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-5 py-2.5 text-xs font-medium text-background disabled:opacity-50"
            >
              {pending && <Loader2 className="size-3.5 animate-spin" />} 저장
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
