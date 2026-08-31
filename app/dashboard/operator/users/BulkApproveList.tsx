"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck, Loader2, Square, CheckSquare } from "lucide-react";
import { approveUsersBulk } from "../actions";

/**
 * 승인 대기 탭 전용 — 각 회원 행 왼쪽에 체크박스, 상단에 전체 선택 + 일괄 승인 툴바.
 * 행 자체(MemberRow)는 서버에서 렌더해 children으로 넘긴다.
 */
export function BulkApproveList({
  items,
}: {
  /** reviewable=false(채널 미등록 크리에이터)는 "전체 선택"에서 제외된다 — 검수할 대상이 없는 승인 방지 */
  items: { id: string; name: string; node: ReactNode; reviewable?: boolean }[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const reviewableIds = items.filter((i) => i.reviewable !== false).map((i) => i.id);
  const everyId = items.map((i) => i.id);
  const excludedCount = everyId.length - reviewableIds.length;
  const allSelected = reviewableIds.length > 0 && reviewableIds.every((id) => selected.has(id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(reviewableIds));
  }

  function approveSelected() {
    if (selected.size === 0 || pending) return;
    if (!window.confirm(`선택한 ${selected.size}명을 승인할까요? 승인 즉시 캠페인 응모가 가능해지고 알림이 발송됩니다.`)) return;
    setResult(null);
    startTransition(async () => {
      const r = await approveUsersBulk([...selected]);
      if (r.ok) {
        setResult({ ok: true, message: `${r.count}명을 승인했어요.` });
        setSelected(new Set());
        router.refresh();
      } else {
        setResult({ ok: false, message: r.error });
      }
    });
  }

  if (items.length === 0) return null;

  return (
    <div>
      {/* 툴바 */}
      <div className="sticky top-14 z-30 -mx-1 mb-3 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-background/95 px-4 py-2.5 backdrop-blur lg:top-2">
        <button
          type="button"
          onClick={toggleAll}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          {allSelected ? <CheckSquare className="size-4 text-accent-ink" /> : <Square className="size-4" />}
          {excludedCount > 0 ? `검수 가능 전체 선택 (${reviewableIds.length})` : `전체 선택 (${reviewableIds.length})`}
        </button>
        {excludedCount > 0 && (
          <button
            type="button"
            onClick={() => setSelected(new Set(everyId))}
            className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            채널 미등록 포함 {everyId.length}명 모두 선택
          </button>
        )}
        <span className="text-xs text-muted-foreground">
          {selected.size > 0 ? `${selected.size}명 선택됨` : "체크박스로 여러 명을 골라 한 번에 승인하세요"}
        </span>
        <button
          type="button"
          onClick={approveSelected}
          disabled={selected.size === 0 || pending}
          className="btn-neon ml-auto inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold disabled:opacity-40"
        >
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCheck className="size-3.5" />}
          선택 {selected.size > 0 ? `${selected.size}명 ` : ""}일괄 승인
        </button>
      </div>

      {result && (
        <div
          className={`mb-3 rounded-xl px-4 py-2.5 text-sm ${
            result.ok ? "bg-success-soft text-success" : "bg-danger-soft text-danger"
          }`}
        >
          {result.message}
        </div>
      )}

      <div className="space-y-2">
        {items.map((it) => {
          const on = selected.has(it.id);
          return (
            <div key={it.id} className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => toggle(it.id)}
                aria-pressed={on}
                aria-label={`${it.name} 선택`}
                className={`mt-5 flex size-6 shrink-0 items-center justify-center rounded-md border transition-colors ${
                  on ? "border-accent bg-accent text-white" : "border-border bg-background hover:bg-muted"
                }`}
              >
                {on && <CheckCheck className="size-3.5" />}
              </button>
              <div className="min-w-0 flex-1">{it.node}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
