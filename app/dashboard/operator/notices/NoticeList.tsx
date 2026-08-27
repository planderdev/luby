"use client";

import { useState, useTransition } from "react";
import { Pencil, Eye, EyeOff, Loader2 } from "lucide-react";
import { NoticeForm, type NoticeRow } from "./NoticeForm";
import { setNoticeActive } from "./actions";

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("ko-KR", { year: "2-digit", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "무기한";

/** 지금 실제로 랜딩에 뜨는 상태인지 */
function liveState(n: NoticeRow): { label: string; tone: string } {
  const now = Date.now();
  if (!n.active) return { label: "꺼짐", tone: "bg-muted text-muted-foreground" };
  if (new Date(n.starts_at).getTime() > now) return { label: "예약", tone: "bg-warning-soft text-warning" };
  if (n.ends_at && new Date(n.ends_at).getTime() <= now) return { label: "종료", tone: "bg-muted text-muted-foreground" };
  return { label: "노출중", tone: "bg-accent-soft text-accent-ink" };
}

export function NoticeList({ notices }: { notices: NoticeRow[] }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (notices.length === 0) {
    return (
      <p className="rounded-3xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        등록된 팝업이 없습니다. 위에서 추가하세요.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {notices.map((n) => {
        const state = liveState(n);
        if (editing === n.id) {
          return (
            <li key={n.id}>
              <NoticeForm notice={n} onDone={() => setEditing(null)} />
            </li>
          );
        }
        return (
          <li key={n.id} className="flex flex-wrap items-center gap-4 rounded-3xl glass-card p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={n.image_url} alt={n.title} className="h-20 w-16 shrink-0 rounded-xl object-cover" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${state.tone}`}>{state.label}</span>
                <span className="truncate text-sm font-medium">{n.title}</span>
                <span className="text-[11px] text-muted-foreground">순서 {n.sort_order}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {fmt(n.starts_at)} ~ {fmt(n.ends_at)}
                {n.link_url && ` · ${n.link_url}`}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => startTransition(async () => { await setNoticeActive(n.id, !n.active); })}
                aria-label={n.active ? "노출 끄기" : "노출 켜기"}
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs hover:bg-muted disabled:opacity-50"
              >
                {pending ? <Loader2 className="size-3.5 animate-spin" /> : n.active ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                {n.active ? "끄기" : "켜기"}
              </button>
              <button
                type="button"
                onClick={() => setEditing(n.id)}
                aria-label="수정"
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs hover:bg-muted"
              >
                <Pencil className="size-3.5" /> 수정
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
