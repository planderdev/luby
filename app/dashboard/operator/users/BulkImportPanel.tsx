"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, Download, Loader2, FileSpreadsheet, AlertTriangle, Check } from "lucide-react";
import { previewMemberImport, commitMemberImport } from "../actions";

type Row = Awaited<ReturnType<typeof previewMemberImport>> extends infer R ? (R extends { ok: true; rows: infer X } ? (X extends (infer I)[] ? I : never) : never) : never;
type Result = { email: string; name: string; role: string; status: "created" | "invited" | "failed"; password?: string; error?: string };

/** 엑셀(CSV/XLSX)로 회원 대량 등록 + 회원 목록 엑셀 내려받기 */
export function BulkImportPanel({ filter }: { filter: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [mode, setMode] = useState<"invite" | "temp">("invite");
  const [results, setResults] = useState<Result[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function preview() {
    const f = fileRef.current?.files?.[0];
    if (!f) return setError("파일을 선택하세요 (.csv 또는 .xlsx)");
    setError(null); setResults(null);
    const fd = new FormData(); fd.set("file", f);
    startTransition(async () => {
      const r = await previewMemberImport(fd);
      if (!r.ok) return setError(r.error);
      setRows(r.rows);
    });
  }
  function commit() {
    if (!rows) return;
    setError(null);
    startTransition(async () => {
      const r = await commitMemberImport(rows, mode);
      if (!r.ok) return setError(r.error);
      setResults(r.results); setRows(null); router.refresh();
    });
  }
  function downloadResults() {
    if (!results) return;
    const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
    const lines = [["이메일", "이름", "역할", "결과", "비밀번호", "오류"], ...results.map((r) => [r.email, r.name, r.role, r.status === "invited" ? "초대 메일 발송" : r.status === "created" ? "생성" : "실패", r.password ?? "", r.error ?? ""])];
    const blob = new Blob(["﻿" + lines.map((l) => l.map(esc).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `luby-import-result-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(a.href);
  }
  const valid = rows?.filter((r) => r.errors.length === 0).length ?? 0;
  const invalid = (rows?.length ?? 0) - valid;
  const roleParam = filter === "advertiser" || filter === "agency" || filter === "influencer" ? filter : "all";

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <a href={`/api/operator/export?type=members&role=${roleParam}`} className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs hover:bg-muted">
        <Download className="size-3.5" /> 엑셀로 내려받기{roleParam !== "all" ? " (현재 탭)" : ""}
      </a>
      <button type="button" onClick={() => setOpen((v) => !v)} className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs hover:bg-muted">
        <Upload className="size-3.5" /> 엑셀로 등록하기
      </button>
      {open && (
        <div className="mt-2 w-full rounded-3xl glass-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold"><FileSpreadsheet className="size-4" /> 엑셀(CSV/XLSX)로 회원 대량 등록</div>
            <a href="/api/operator/export?type=member-template" className="inline-flex items-center gap-1 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"><Download className="size-3.5" /> 템플릿 내려받기</a>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">열: 역할(광고주/대행사/크리에이터) · 이메일 · 이름 · 연락처 · 회사명 · 사업자등록번호 · 활동지역 · 대표채널 · 채널URL · 전문분야(;구분, 최대 3) · 비밀번호(선택). 한 번에 300명까지.</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="text-xs" />
            <button type="button" onClick={preview} disabled={pending} className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-xs font-medium text-background disabled:opacity-50">
              {pending && !rows ? <Loader2 className="size-3.5 animate-spin" /> : null} 검증 미리보기
            </button>
          </div>
          {error && <p className="mt-2 text-xs text-danger">{error}</p>}

          {rows && (
            <div className="mt-4">
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-1 font-medium text-success"><Check className="size-3" /> 등록 가능 {valid}</span>
                {invalid > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-danger-soft px-2.5 py-1 font-medium text-danger"><AlertTriangle className="size-3" /> 오류 {invalid} (건너뜀)</span>}
                <span className="ml-auto inline-flex items-center gap-2">
                  비밀번호 열이 빈 행:
                  <select value={mode} onChange={(e) => setMode(e.target.value as "invite" | "temp")} className="rounded-full border border-border bg-background px-3 py-1">
                    <option value="invite">초대 메일 발송</option>
                    <option value="temp">임시 비밀번호 생성</option>
                  </select>
                </span>
              </div>
              <div className="mt-3 max-h-72 overflow-auto rounded-2xl border border-border">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-muted text-left"><tr><th className="px-3 py-2">행</th><th className="px-3 py-2">역할</th><th className="px-3 py-2">이메일</th><th className="px-3 py-2">이름</th><th className="px-3 py-2">회사/지역</th><th className="px-3 py-2">검증</th></tr></thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.line} className={r.errors.length ? "bg-danger-soft/40" : ""}>
                        <td className="px-3 py-1.5 text-muted-foreground">{r.line}</td>
                        <td className="px-3 py-1.5">{r.role === "advertiser" ? (r.advertiserKind === "agency" ? "대행사" : "광고주") : r.role === "influencer" ? "크리에이터" : "?"}</td>
                        <td className="px-3 py-1.5">{r.email}</td>
                        <td className="px-3 py-1.5">{r.name}</td>
                        <td className="px-3 py-1.5 text-muted-foreground">{r.role === "advertiser" ? r.companyName : [r.regionName, r.channelName, r.categoryNames.join(";")].filter(Boolean).join(" · ")}</td>
                        <td className="px-3 py-1.5">{r.errors.length ? <span className="text-danger">{r.errors.join(", ")}</span> : <span className="text-success">OK</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button type="button" onClick={commit} disabled={pending || valid === 0} className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background disabled:opacity-50">
                  {pending ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />} {valid}명 등록 실행
                </button>
                <button type="button" onClick={() => setRows(null)} className="rounded-full px-3 py-2 text-xs text-muted-foreground hover:text-foreground">취소</button>
              </div>
            </div>
          )}

          {results && (
            <div className="mt-4 rounded-2xl bg-muted/50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span>등록 결과 — 성공 <b>{results.filter((r) => r.status !== "failed").length}</b> · 실패 <b>{results.filter((r) => r.status === "failed").length}</b></span>
                <button type="button" onClick={downloadResults} className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-xs font-medium text-background"><Download className="size-3.5" /> 결과 CSV 내려받기 (비밀번호 포함)</button>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">임시 비밀번호·지정 비밀번호는 이 결과 파일에만 남습니다 — 지금 내려받아 회원에게 전달하세요.</p>
              <ul className="mt-2 max-h-40 overflow-auto text-xs">
                {results.map((r) => <li key={r.email} className={r.status === "failed" ? "text-danger" : ""}>{r.email} · {r.role} · {r.status === "invited" ? "초대 메일" : r.status === "created" ? "생성" : `실패: ${r.error}`}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
