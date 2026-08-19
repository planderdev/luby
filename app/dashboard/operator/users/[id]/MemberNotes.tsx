"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { StickyNote, Pin, Trash2, Loader2, Tag, X, Plus } from "lucide-react";
import { addMemberNote, deleteMemberNote, setMemberTags } from "../../actions";

const SUGGESTED = ["VIP", "주의", "파트너", "대량 운영", "응답 느림", "정산 확인", "해외", "샤오홍슈"];

export function MemberNotes({
  profileId,
  notes,
  tags,
}: {
  profileId: string;
  notes: { id: string; body: string; pinned: boolean; created_at: string; author_name: string | null }[];
  tags: string[];
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [curTags, setCurTags] = useState<string[]>(tags);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function add() {
    setError(null);
    startTransition(async () => {
      const r = await addMemberNote(profileId, body, pinned);
      if (!r.ok) return setError(r.error);
      setBody(""); setPinned(false); router.refresh();
    });
  }
  function remove(id: string) {
    startTransition(async () => {
      const r = await deleteMemberNote(id, profileId);
      if (!r.ok) setError(r.error); else router.refresh();
    });
  }
  function saveTags(next: string[]) {
    setError(null);
    startTransition(async () => {
      const r = await setMemberTags(profileId, next);
      if (!r.ok) return setError(r.error);
      setCurTags(r.tags);
    });
  }
  function addTag(t: string) {
    const v = t.trim();
    if (!v || curTags.includes(v)) return;
    saveTags([...curTags, v]);
    setTagInput("");
  }

  return (
    <section className="rounded-3xl glass-card p-6 lg:col-span-3">
      <div className="grid gap-6 md:grid-cols-[1fr_1.4fr]">
        {/* 태그 */}
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold"><Tag className="size-4" /> 운영 태그 <span className="text-xs font-normal text-muted-foreground">(회원에게 비공개)</span></h2>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {curTags.map((t) => (
              <span key={t} className="inline-flex items-center gap-1 rounded-full bg-foreground px-2.5 py-1 text-xs text-background">
                {t}
                <button type="button" onClick={() => saveTags(curTags.filter((x) => x !== t))} aria-label="태그 삭제" className="opacity-70 hover:opacity-100"><X className="size-3" /></button>
              </span>
            ))}
            {curTags.length === 0 && <span className="text-xs text-muted-foreground">태그 없음</span>}
          </div>
          <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); addTag(tagInput); }}>
            <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} placeholder="태그 입력 후 Enter" className="flex-1 rounded-full border border-border bg-background px-3 py-1.5 text-xs outline-none" />
            <button type="submit" disabled={pending} className="rounded-full border border-border px-3 py-1.5 text-xs hover:bg-muted"><Plus className="size-3.5" /></button>
          </form>
          <div className="mt-2 flex flex-wrap gap-1">
            {SUGGESTED.filter((s) => !curTags.includes(s)).map((s) => (
              <button key={s} type="button" onClick={() => addTag(s)} className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-muted">+ {s}</button>
            ))}
          </div>
        </div>

        {/* 메모 */}
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold"><StickyNote className="size-4" /> 운영 메모 <span className="text-xs font-normal text-muted-foreground">(상담 이력 · 운영자끼리 공유)</span></h2>
          <div className="mt-3">
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="예: 8/19 전화 상담 — 9월 신메뉴 캠페인 예정, 샤오홍슈 채널 희망" className="w-full resize-none rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-foreground" />
            <div className="mt-2 flex items-center justify-between gap-2">
              <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} className="size-3.5" /> 상단 고정</label>
              <button type="button" onClick={add} disabled={pending || !body.trim()} className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-xs font-medium text-background disabled:opacity-50">
                {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />} 메모 추가
              </button>
            </div>
          </div>
          <ul className="mt-4 space-y-2">
            {notes.map((n) => (
              <li key={n.id} className={`rounded-2xl px-4 py-3 text-sm ${n.pinned ? "bg-accent-soft/50" : "bg-muted/50"}`}>
                <div className="flex items-start justify-between gap-2">
                  <p className="whitespace-pre-wrap leading-relaxed">{n.pinned && <Pin className="mr-1 inline size-3.5 text-accent-ink" />}{n.body}</p>
                  <button type="button" onClick={() => remove(n.id)} aria-label="삭제" className="shrink-0 text-muted-foreground hover:text-danger"><Trash2 className="size-3.5" /></button>
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">{n.author_name ?? "운영자"} · {new Date(n.created_at).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
              </li>
            ))}
            {notes.length === 0 && <li className="text-xs text-muted-foreground">메모가 없어요.</li>}
          </ul>
          {error && <p className="mt-2 text-xs text-danger">{error}</p>}
        </div>
      </div>
    </section>
  );
}
