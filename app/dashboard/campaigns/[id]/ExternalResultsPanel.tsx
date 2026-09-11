"use client";

import { useRef, useState, useTransition } from "react";
import { FileSpreadsheet, Loader2, Trash2, ExternalLink, Upload } from "lucide-react";
import type { ExternalResultRow } from "@/lib/external-results-import";
import { previewExternalResults, commitExternalResults, deleteExternalResult } from "./external-results-actions";

export type ExternalResultItem = {
  id: string;
  seq: number;
  visited_at: string | null;
  creator_url: string;
  followers: number | null;
  post_url: string | null;
  likes: number | null;
  note: string | null;
};

const fmt = (n: number | null) => (n == null ? "—" : n >= 10000 ? `${(n / 10000).toFixed(1).replace(/\.0$/, "")}만` : n.toLocaleString());
const host = (u: string) => u.replace(/^https?:\/\//, "").split("/")[0];

/**
 * 외부 채널(샤오홍슈 등) 체험단 결과 — 엑셀 업로드로 등록, 행 삭제.
 * 운영자·소유 광고주에게만 보인다(호출부 가드). 등록 즉시 성과 카드·결과 보고서에 반영.
 */
export function ExternalResultsPanel({ campaignId, items }: { campaignId: string; items: ExternalResultItem[] }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<{ sheets: string[]; sheet: string; rows: ExternalResultRow[] } | null>(null);
  const [replace, setReplace] = useState(items.length > 0);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const posted = items.filter((r) => r.post_url).length;
  const followers = items.reduce((s, r) => s + (r.followers ?? 0), 0);
  const likes = items.reduce((s, r) => s + (r.likes ?? 0), 0);

  function runPreview(sheet?: string) {
    const f = fileRef.current?.files?.[0];
    if (!f) { setMsg({ kind: "err", text: "엑셀(.xlsx) 또는 CSV 파일을 선택해주세요." }); return; }
    const fd = new FormData(); fd.set("file", f);
    setMsg(null);
    startTransition(async () => {
      const r = await previewExternalResults(campaignId, fd, sheet);
      if (!r.ok) { setMsg({ kind: "err", text: r.error }); setPreview(null); return; }
      setPreview({ sheets: r.sheets, sheet: r.sheet, rows: r.rows });
    });
  }
  function commit() {
    if (!preview) return;
    startTransition(async () => {
      const r = await commitExternalResults(campaignId, preview.rows, replace);
      if (!r.ok) { setMsg({ kind: "err", text: r.error }); return; }
      setMsg({ kind: "ok", text: `${r.count}행을 등록했어요. 성과 카드와 결과 보고서에 바로 반영됩니다.` });
      setPreview(null);
      if (fileRef.current) fileRef.current.value = "";
    });
  }
  function remove(id: string) {
    startTransition(async () => {
      const r = await deleteExternalResult(campaignId, id);
      if (!r.ok) setMsg({ kind: "err", text: r.error });
    });
  }

  const invalid = preview ? preview.rows.filter((r) => r.errors.length).length : 0;

  return (
    <section className="mt-10 rounded-3xl glass-card p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-accent-soft">
            <FileSpreadsheet className="size-5 text-accent-ink" />
          </div>
          <div>
            <h3 className="text-lg font-semibold tracking-tight">외부 채널 체험단 결과</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">샤오홍슈 등 루비 밖에서 운영한 체험단의 방문·게시 기록을 엑셀로 올리면 결과 보고서에 실립니다.</p>
          </div>
        </div>
        {items.length > 0 && (
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-muted px-3 py-1"><b className="text-foreground">{items.length}</b>명 참여</span>
            <span className="rounded-full bg-muted px-3 py-1"><b className="text-foreground">{posted}</b>건 게시</span>
            <span className="rounded-full bg-muted px-3 py-1">팔로워 합 <b className="text-foreground">{fmt(followers)}</b></span>
            {likes > 0 && <span className="rounded-full bg-muted px-3 py-1">좋아요·즐겨찾기 <b className="text-foreground">{fmt(likes)}</b></span>}
          </div>
        )}
      </div>

      {/* 업로드 */}
      <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl bg-muted/40 px-4 py-3">
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="text-xs" onChange={() => setPreview(null)} />
        <button type="button" onClick={() => runPreview()} disabled={pending} className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-medium hover:bg-muted disabled:opacity-50">
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />} 미리보기
        </button>
        <span className="text-[11px] text-muted-foreground">열 이름으로 자동 인식: 순번 · 방문일자 · 계정링크 · 팔로워수 · 업로드 링크 · 좋아요 · 내용 (한/중/영 표기 모두 가능)</span>
      </div>

      {msg && (
        <p className={`mt-3 text-sm ${msg.kind === "ok" ? "text-success" : "text-danger"}`}>{msg.text}</p>
      )}

      {preview && (
        <div className="mt-4 rounded-2xl border border-border p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm">
              {preview.sheets.length > 1 ? (
                <>
                  <span className="text-muted-foreground">시트</span>
                  <select value={preview.sheet} onChange={(e) => runPreview(e.target.value)} className="rounded-xl glass-card px-3 py-1.5 text-sm">
                    {preview.sheets.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </>
              ) : <span className="font-medium">{preview.sheet}</span>}
              <span className="text-muted-foreground">· {preview.rows.length}행{invalid ? ` (오류 ${invalid}행 제외)` : ""}</span>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-xs">
                <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} className="size-3.5 accent-accent" />
                기존 결과를 지우고 교체
              </label>
              <button type="button" onClick={commit} disabled={pending || preview.rows.length - invalid === 0} className="btn-neon rounded-full px-4 py-2 text-xs font-bold disabled:opacity-50">
                {pending ? "등록 중…" : `${preview.rows.length - invalid}행 등록`}
              </button>
            </div>
          </div>
          <div className="mt-3 max-h-64 overflow-auto text-xs">
            <table className="w-full min-w-[640px]">
              <thead><tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground"><th className="pb-1 pr-3">#</th><th className="pb-1 pr-3">방문일</th><th className="pb-1 pr-3">계정</th><th className="pb-1 pr-3">팔로워</th><th className="pb-1 pr-3">게시물</th><th className="pb-1 pr-3">좋아요</th><th className="pb-1">내용</th></tr></thead>
              <tbody>
                {preview.rows.map((r) => (
                  <tr key={r.seq} className={`border-t border-border/60 ${r.errors.length ? "text-danger" : ""}`}>
                    <td className="py-1 pr-3 tabular-nums">{r.seq}</td>
                    <td className="py-1 pr-3 tabular-nums">{r.visited_at ?? "—"}</td>
                    <td className="py-1 pr-3 truncate max-w-[180px]">{host(r.creator_url)}{r.errors.length ? ` · ${r.errors.join(", ")}` : ""}</td>
                    <td className="py-1 pr-3 tabular-nums">{fmt(r.followers)}</td>
                    <td className="py-1 pr-3">{r.post_url ? "있음" : "미게시"}</td>
                    <td className="py-1 pr-3 tabular-nums">{fmt(r.likes)}</td>
                    <td className="py-1 truncate max-w-[220px]">{r.note ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 등록된 결과 */}
      {items.length > 0 && (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="pb-2 pr-3 font-medium">#</th><th className="pb-2 pr-3 font-medium">방문일</th><th className="pb-2 pr-3 font-medium">계정</th><th className="pb-2 pr-3 font-medium">팔로워</th><th className="pb-2 pr-3 font-medium">게시물</th><th className="pb-2 pr-3 font-medium">좋아요</th><th className="pb-2 pr-3 font-medium">내용</th><th className="pb-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id} className="border-b border-border/60 last:border-0">
                  <td className="py-2 pr-3 tabular-nums text-muted-foreground">{r.seq}</td>
                  <td className="py-2 pr-3 tabular-nums">{r.visited_at ?? "—"}</td>
                  <td className="py-2 pr-3"><a href={r.creator_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline underline-offset-2">{host(r.creator_url)} <ExternalLink className="size-3" /></a></td>
                  <td className="py-2 pr-3 tabular-nums">{fmt(r.followers)}</td>
                  <td className="py-2 pr-3">{r.post_url ? <a href={r.post_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs underline underline-offset-2">보기 <ExternalLink className="size-3" /></a> : <span className="text-xs text-muted-foreground">미게시</span>}</td>
                  <td className="py-2 pr-3 tabular-nums">{fmt(r.likes)}</td>
                  <td className="py-2 pr-3 text-xs text-muted-foreground max-w-[260px] truncate" title={r.note ?? ""}>{r.note ?? ""}</td>
                  <td className="py-2 text-right"><button type="button" onClick={() => remove(r.id)} disabled={pending} aria-label="삭제" className="text-muted-foreground hover:text-danger"><Trash2 className="size-3.5" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
