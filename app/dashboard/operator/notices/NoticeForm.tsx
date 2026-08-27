"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { ImageUpload } from "@/components/ImageUpload";
import { createNotice, updateNotice, deleteNotice, type NoticeInput } from "./actions";

export type NoticeRow = {
  id: string;
  title: string;
  image_url: string;
  link_url: string | null;
  starts_at: string;
  ends_at: string | null;
  active: boolean;
  sort_order: number;
};

/** ISO → datetime-local 값 (UTC 로 해석하는 규약을 저장 쪽과 맞춘다) */
const toLocalValue = (iso: string | null) => (iso ? iso.slice(0, 16) : "");

export function NoticeForm({ notice, onDone }: { notice?: NoticeRow; onDone?: () => void }) {
  const editing = !!notice;
  const [title, setTitle] = useState(notice?.title ?? "");
  const [imageUrl, setImageUrl] = useState(notice?.image_url ?? "");
  const [linkUrl, setLinkUrl] = useState(notice?.link_url ?? "");
  const [startsAt, setStartsAt] = useState(toLocalValue(notice?.starts_at ?? null));
  const [endsAt, setEndsAt] = useState(toLocalValue(notice?.ends_at ?? null));
  const [sortOrder, setSortOrder] = useState(String(notice?.sort_order ?? 0));
  const [active, setActive] = useState(notice?.active ?? true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    setError(null);
    const input: NoticeInput = {
      title,
      imageUrl,
      linkUrl,
      startsAt: startsAt || null,
      endsAt: endsAt || null,
      sortOrder: Number(sortOrder) || 0,
      active,
    };
    startTransition(async () => {
      const r = editing ? await updateNotice(notice.id, input) : await createNotice(input);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      if (!editing) {
        setTitle("");
        setImageUrl("");
        setLinkUrl("");
        setEndsAt("");
        setSortOrder("0");
      }
      onDone?.();
    });
  };

  const remove = () => {
    if (!editing) return;
    setError(null);
    startTransition(async () => {
      const r = await deleteNotice(notice.id);
      if (!r.ok) setError(r.error);
      else onDone?.();
    });
  };

  const field = "w-full rounded-2xl glass-card px-4 py-3 text-sm outline-none";
  const label = "mb-1.5 block text-xs font-medium text-muted-foreground";
  const uid = notice?.id ?? "new";

  return (
    <div className="rounded-3xl glass-card p-6">
      <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
        <div>
          <span className={label}>팝업 이미지</span>
          <ImageUpload bucket="notice-images" value={imageUrl} onChange={setImageUrl} />
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor={`notice-title-${uid}`} className={label}>
              제목 <span className="text-muted-foreground">(목록 구분용 · 이미지 대체 텍스트)</span>
            </label>
            <input
              id={`notice-title-${uid}`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              placeholder="예: 9월 체험단 오픈 안내"
              className={field}
            />
          </div>

          <div>
            <label htmlFor={`notice-link-${uid}`} className={label}>
              클릭 시 이동할 링크 <span className="text-muted-foreground">(선택)</span>
            </label>
            <input
              id={`notice-link-${uid}`}
              value={linkUrl ?? ""}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://luby.im/c"
              className={field}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor={`notice-start-${uid}`} className={label}>노출 시작</label>
              <input id={`notice-start-${uid}`} type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className={field} />
            </div>
            <div>
              <label htmlFor={`notice-end-${uid}`} className={label}>
                노출 종료 <span className="text-muted-foreground">(비우면 무기한)</span>
              </label>
              <input id={`notice-end-${uid}`} type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className={field} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor={`notice-order-${uid}`} className={label}>
                노출 순서 <span className="text-muted-foreground">(숫자가 클수록 앞)</span>
              </label>
              <input id={`notice-order-${uid}`} type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className={field} />
            </div>
            <div className="flex items-end">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="size-4 accent-accent" />
                지금 노출하기
              </label>
            </div>
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background disabled:opacity-50"
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : editing ? <Save className="size-4" /> : <Plus className="size-4" />}
              {editing ? "저장" : "팝업 추가"}
            </button>
            {editing && (
              <button
                type="button"
                onClick={remove}
                disabled={pending}
                className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm hover:bg-muted disabled:opacity-50"
              >
                <Trash2 className="size-4" /> 삭제
              </button>
            )}
            {onDone && editing && (
              <button type="button" onClick={onDone} className="text-xs text-muted-foreground hover:text-foreground">
                취소
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
