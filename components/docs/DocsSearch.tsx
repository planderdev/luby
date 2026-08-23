"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";

export type SearchItem = { href: string; group: string; title: string; text: string; headings: string[] };

/** ⌘K 검색 — 제목·소제목·본문 부분 일치, 상위 8개 */
export function DocsSearch({ items, lang = "ko", labels = { search: "검색…", placeholder: "기능·화면 이름으로 검색 (예: 출금, QR 포스터, 검수)", noResults: "{labels.noResults}", close: "닫기" } }: { items: SearchItem[]; lang?: string; labels?: { search: string; placeholder: string; noResults: string; close: string } }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen(true); }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => { if (open) { setQ(""); setSel(0); setTimeout(() => inputRef.current?.focus(), 0); } }, [open]);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return items.slice(0, 8);
    const scored = items.map((it) => {
      let score = 0;
      if (it.title.toLowerCase().includes(term)) score += 10;
      if (it.headings.some((h) => h.toLowerCase().includes(term))) score += 5;
      if (it.text.toLowerCase().includes(term)) score += 1;
      return { it, score };
    }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score);
    return scored.slice(0, 8).map((x) => x.it);
  }, [q, items]);

  // 검색어 로그: 입력 멈춤 800ms 후 1회(세션 내 같은 검색어 중복 제외), 클릭 시 문서 경로 추가
  const logged = useRef(new Set<string>());
  const log = (q: string, resultCount: number, clicked?: string) => {
    const key = q.trim().toLowerCase();
    if (key.length < 2) return;
    if (!clicked && logged.current.has(key)) return;
    logged.current.add(key);
    fetch("/api/docs/search", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ q: key, lang, results: resultCount, clicked }), keepalive: true }).catch(() => {});
  };
  useEffect(() => {
    if (!open || q.trim().length < 2) return;
    const t = setTimeout(() => log(q, results.length), 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, open]);

  function go(href: string) { if (q.trim().length >= 2) log(q, results.length, href); setOpen(false); router.push(href); }
  function snippet(it: SearchItem) {
    const term = q.trim().toLowerCase();
    if (!term) return it.text.slice(0, 90);
    const i = it.text.toLowerCase().indexOf(term);
    if (i < 0) return it.text.slice(0, 90);
    return (i > 30 ? "…" : "") + it.text.slice(Math.max(0, i - 30), i + 70);
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted">
        <Search className="size-3.5" /> <span className="hidden sm:inline">{labels.search}</span>
        <kbd className="hidden rounded border border-border px-1 text-[10px] sm:inline">⌘K</kbd>
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-foreground/30 p-4 pt-[12vh]" onClick={() => setOpen(false)}>
          <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-border bg-background shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 border-b border-border px-4">
              <Search className="size-4 text-muted-foreground" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => { setQ(e.target.value); setSel(0); }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(results.length - 1, s + 1)); }
                  if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
                  if (e.key === "Enter" && results[sel]) go(results[sel].href);
                }}
                placeholder={labels.placeholder}
                className="h-12 flex-1 bg-transparent text-sm outline-none"
              />
              <button type="button" onClick={() => setOpen(false)} aria-label={labels.close} className="rounded-full p-1 text-muted-foreground hover:bg-muted"><X className="size-4" /></button>
            </div>
            <ul className="max-h-[60vh] overflow-y-auto p-2">
              {results.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted-foreground">결과가 없어요. 다른 단어로 찾아보세요.</li>}
              {results.map((r, i) => (
                <li key={r.href}>
                  <button type="button" onMouseEnter={() => setSel(i)} onClick={() => go(r.href)} className={`block w-full rounded-2xl px-3 py-2.5 text-left ${i === sel ? "bg-muted" : ""}`}>
                    <div className="text-[11px] text-muted-foreground">{r.group}</div>
                    <div className="text-sm font-medium">{r.title}</div>
                    <div className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{snippet(r)}</div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
