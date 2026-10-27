"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, ExternalLink, FileSpreadsheet, Link2, Loader2, Trash2, Upload } from "lucide-react";
import type { ReviewImportRow } from "@/lib/review-report-import";
import { channelLabel, hostOf } from "@/lib/review-channels";
import {
  createReviewReport,
  deleteReviewReport,
  deleteReviewReportRow,
  previewReviewReport,
  replaceReviewReportRows,
  setReviewReportPublic,
  updateReviewReport,
  type ReviewReportInput,
} from "@/app/dashboard/reports/actions";
import { prefillFromCampaign, type CampaignOption } from "@/app/dashboard/reports/campaign-options";

export type ExistingRow = {
  id: string;
  seq: number;
  channel: string;
  creator_name: string | null;
  creator_url: string | null;
  post_url: string;
  posted_at: string | null;
  followers: number | null;
  likes: number | null;
  comments: number | null;
  views: number | null;
  note: string | null;
};

type Preview = { sheets: string[]; sheet: string; mode: "header" | "links"; rows: ReviewImportRow[] };

const INPUT = "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent";
const LABEL = "block text-xs font-medium text-muted-foreground";
const fmt = (n: number | null) => (n == null ? "—" : n >= 10000 ? `${(n / 10000).toFixed(1).replace(/\.0$/, "")}만` : n.toLocaleString());
const TEMPLATE_CSV = "﻿이름,채널,리뷰 링크,팔로워,좋아요,게시일,비고\n김하늘,인스타그램,https://www.instagram.com/p/XXXX/,12000,350,2026-10-21,릴스\n";

/**
 * 결과 보고서 편집기 — 만들기(create)·편집(edit) 공용.
 * 엑셀 미리보기 → 생성/행 교체는 서버 액션, 공유 링크는 /r/<token>.
 */
export function ReviewReportEditor({
  mode,
  reportId,
  token,
  isPublic: initialPublic = true,
  justCreated = false,
  siteUrl,
  campaigns,
  initial,
  existingRows = [],
}: {
  mode: "create" | "edit";
  reportId?: string;
  token?: string;
  isPublic?: boolean;
  justCreated?: boolean;
  siteUrl: string;
  campaigns: CampaignOption[];
  initial: ReviewReportInput;
  existingRows?: ExistingRow[];
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    title: initial.title,
    business_name: initial.business_name,
    campaign_id: initial.campaign_id ?? "",
    period_start: initial.period_start ?? "",
    period_end: initial.period_end ?? "",
    recruit: initial.recruit_count == null ? "" : String(initial.recruit_count),
    memo: initial.memo ?? "",
  });
  const [preview, setPreview] = useState<Preview | null>(null);
  const [isPublic, setIsPublic] = useState(initialPublic);
  const [copied, setCopied] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const url = token ? `${siteUrl}/r/${token}` : null;
  const validRows = preview ? preview.rows.filter((r) => r.errors.length === 0) : [];
  const invalid = preview ? preview.rows.length - validRows.length : 0;

  function toInput(): ReviewReportInput {
    return {
      title: form.title,
      business_name: form.business_name,
      campaign_id: form.campaign_id || null,
      period_start: form.period_start || null,
      period_end: form.period_end || null,
      recruit_count: form.recruit.trim() === "" ? null : Number(form.recruit),
      memo: form.memo || null,
    };
  }
  function pickCampaign(id: string) {
    const c = campaigns.find((x) => x.id === id);
    if (!c) { setForm((f) => ({ ...f, campaign_id: "" })); return; }
    const p = prefillFromCampaign(c);
    setForm((f) => ({
      ...f,
      campaign_id: c.id,
      title: f.title.trim() ? f.title : p.title,
      business_name: f.business_name.trim() ? f.business_name : p.business_name,
      period_start: f.period_start || p.period_start || "",
      period_end: f.period_end || p.period_end || "",
      recruit: f.recruit || (p.recruit_count == null ? "" : String(p.recruit_count)),
    }));
  }
  function runPreview(sheet?: string) {
    const f = fileRef.current?.files?.[0];
    if (!f) { setMsg({ kind: "err", text: "엑셀(.xlsx) 또는 CSV 파일을 선택해주세요." }); return; }
    const fd = new FormData();
    fd.set("file", f);
    setMsg(null);
    startTransition(async () => {
      const r = await previewReviewReport(fd, sheet);
      if (!r.ok) { setMsg({ kind: "err", text: r.error }); setPreview(null); return; }
      setPreview({ sheets: r.sheets, sheet: r.sheet, mode: r.mode, rows: r.rows });
      if (!form.business_name && !form.title && r.rows[0]) setForm((x) => ({ ...x, title: `${channelLabel(r.rows[0].channel)} 체험단 결과 보고서` }));
    });
  }
  function create() {
    if (!preview) { setMsg({ kind: "err", text: "리뷰 링크가 든 엑셀을 먼저 올려 미리보기를 확인해주세요." }); return; }
    setMsg(null);
    startTransition(async () => {
      const r = await createReviewReport(toInput(), preview.rows);
      if (!r.ok) { setMsg({ kind: "err", text: r.error }); return; }
      router.push(`/dashboard/reports/${r.id}?created=1`);
    });
  }
  function save() {
    if (!reportId) return;
    setMsg(null);
    startTransition(async () => {
      const r = await updateReviewReport(reportId, toInput());
      setMsg(r.ok ? { kind: "ok", text: "저장했어요. 보고서 페이지에 바로 반영됩니다." } : { kind: "err", text: r.error });
      if (r.ok) router.refresh();
    });
  }
  function replaceRows() {
    if (!reportId || !preview) return;
    setMsg(null);
    startTransition(async () => {
      const r = await replaceReviewReportRows(reportId, preview.rows);
      if (!r.ok) { setMsg({ kind: "err", text: r.error }); return; }
      setMsg({ kind: "ok", text: `${r.count}행으로 교체했어요.` });
      setPreview(null);
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    });
  }
  function removeRow(id: string) {
    if (!reportId) return;
    startTransition(async () => {
      const r = await deleteReviewReportRow(reportId, id);
      if (!r.ok) setMsg({ kind: "err", text: r.error });
      else router.refresh();
    });
  }
  function togglePublic(on: boolean) {
    if (!reportId) return;
    setIsPublic(on);
    startTransition(async () => {
      const r = await setReviewReportPublic(reportId, on);
      if (!r.ok) { setIsPublic(!on); setMsg({ kind: "err", text: r.error }); }
    });
  }
  function remove() {
    if (!reportId) return;
    if (!window.confirm("이 보고서를 삭제할까요? 공유한 링크도 더 이상 열리지 않습니다.")) return;
    startTransition(async () => {
      const r = await deleteReviewReport(reportId);
      if (!r.ok) { setMsg({ kind: "err", text: r.error }); return; }
      router.push("/dashboard/reports");
      router.refresh();
    });
  }
  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setMsg({ kind: "err", text: "복사하지 못했어요. 링크를 직접 선택해 복사해주세요." });
    }
  }

  const uploadCard = (
    <section className="rounded-3xl glass-card p-6">
      <div className="flex items-start gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-accent-soft">
          <FileSpreadsheet className="size-5 text-accent-ink" />
        </div>
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{mode === "create" ? "리뷰 링크 엑셀" : "리뷰 링크 교체"}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            리뷰(게시물) 링크가 든 시트를 올리세요. 열 이름이 있으면 이름·채널·팔로워·좋아요·게시일·비고까지 읽고, 없으면 링크만으로도 만듭니다.
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-muted/40 px-4 py-3">
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="text-xs" aria-label="엑셀 파일" onChange={() => { setPreview(null); setMsg(null); }} />
        <button type="button" onClick={() => runPreview()} disabled={pending} className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-medium hover:bg-muted disabled:opacity-50">
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />} 미리보기
        </button>
        <a href={`data:text/csv;charset=utf-8,${encodeURIComponent(TEMPLATE_CSV)}`} download="루비AI-결과보고서-템플릿.csv" className="text-[11px] text-muted-foreground underline underline-offset-2">
          템플릿 CSV 받기
        </a>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        열 이름 자동 인식: 이름 · 채널 · 리뷰 링크(URL) · 계정 링크 · 팔로워 · 좋아요 · 댓글 · 조회수 · 게시일 · 비고 (한/중/영 표기 모두 가능, 최대 500행)
      </p>

      {preview && (
        <div className="mt-4 rounded-2xl border border-border p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {preview.sheets.length > 1 ? (
                <>
                  <span className="text-muted-foreground">시트</span>
                  <select value={preview.sheet} onChange={(e) => runPreview(e.target.value)} aria-label="시트 선택" className="rounded-xl border border-border bg-background px-3 py-1.5 text-sm">
                    {preview.sheets.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </>
              ) : (
                <span className="font-medium">{preview.sheet}</span>
              )}
              <span className="text-muted-foreground">
                · {validRows.length}행{invalid ? ` (링크 없는 ${invalid}행 제외)` : ""}
                {preview.mode === "links" ? " · 열 이름 없이 링크만 읽음" : ""}
              </span>
            </div>
            {mode === "edit" && (
              <button type="button" onClick={replaceRows} disabled={pending || validRows.length === 0} className="btn-neon rounded-full px-4 py-2 text-xs font-bold disabled:opacity-50">
                {pending ? "교체 중…" : `기존 ${existingRows.length}행 → ${validRows.length}행으로 교체`}
              </button>
            )}
          </div>
          <div className="mt-3 max-h-72 overflow-auto text-xs">
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="pb-1 pr-3">#</th><th className="pb-1 pr-3">채널</th><th className="pb-1 pr-3">크리에이터</th><th className="pb-1 pr-3">리뷰 링크</th><th className="pb-1 pr-3">팔로워</th><th className="pb-1 pr-3">좋아요</th><th className="pb-1 pr-3">게시일</th><th className="pb-1">비고</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((r, i) => (
                  <tr key={`${r.seq}-${i}`} className={`border-t border-border/60 ${r.errors.length ? "text-danger" : ""}`}>
                    <td className="py-1 pr-3 tabular-nums">{r.seq}</td>
                    <td className="py-1 pr-3 whitespace-nowrap">{channelLabel(r.channel)}</td>
                    <td className="py-1 pr-3 max-w-[160px] truncate">{r.creator_name ?? (r.creator_url ? hostOf(r.creator_url) : "—")}</td>
                    <td className="py-1 pr-3 max-w-[220px] truncate" title={r.post_url ?? ""}>{r.post_url ? r.post_url.replace(/^https?:\/\//, "") : r.errors.join(", ")}</td>
                    <td className="py-1 pr-3 tabular-nums">{fmt(r.followers)}</td>
                    <td className="py-1 pr-3 tabular-nums">{fmt(r.likes)}</td>
                    <td className="py-1 pr-3 tabular-nums">{r.posted_at ?? "—"}</td>
                    <td className="py-1 max-w-[180px] truncate">{r.note ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );

  const formCard = (
    <section className="rounded-3xl glass-card p-6">
      <h2 className="text-lg font-semibold tracking-tight">보고서 정보</h2>
      <p className="mt-0.5 text-sm text-muted-foreground">보고서 상단에 실리는 내용입니다. 캠페인을 연결하면 제목·상호·기간을 채워 둡니다.</p>
      <div className="mt-5 grid gap-4">
        <div>
          <label htmlFor="rr-campaign" className={LABEL}>캠페인 연결 (선택)</label>
          <select id="rr-campaign" value={form.campaign_id} onChange={(e) => pickCampaign(e.target.value)} className={`mt-1 ${INPUT}`}>
            <option value="">연결 안 함 — 루비 밖에서 진행한 체험단</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>{c.title} · {c.business_name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="rr-title" className={LABEL}>보고서 제목 <span className="text-accent-ink">*</span></label>
          <input id="rr-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={120} placeholder="예: 명동 미쓰족발 샤오홍슈 체험단 결과" className={`mt-1 ${INPUT}`} />
        </div>
        <div>
          <label htmlFor="rr-biz" className={LABEL}>브랜드 · 매장</label>
          <input id="rr-biz" value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} maxLength={120} placeholder="예: 미쓰족발 명동점" className={`mt-1 ${INPUT}`} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="rr-start" className={LABEL}>진행 시작일</label>
            <input id="rr-start" type="date" value={form.period_start} onChange={(e) => setForm({ ...form, period_start: e.target.value })} className={`mt-1 ${INPUT}`} />
          </div>
          <div>
            <label htmlFor="rr-end" className={LABEL}>진행 종료일</label>
            <input id="rr-end" type="date" value={form.period_end} onChange={(e) => setForm({ ...form, period_end: e.target.value })} className={`mt-1 ${INPUT}`} />
          </div>
        </div>
        <div>
          <label htmlFor="rr-recruit" className={LABEL}>모집 인원 (선택)</label>
          <input id="rr-recruit" type="number" min={0} max={100000} inputMode="numeric" value={form.recruit} onChange={(e) => setForm({ ...form, recruit: e.target.value })} placeholder="참여율 계산에 씁니다" className={`mt-1 ${INPUT}`} />
        </div>
        <div>
          <label htmlFor="rr-memo" className={LABEL}>운영 요약 (선택, 보고서 상단에 표시)</label>
          <textarea id="rr-memo" value={form.memo} onChange={(e) => setForm({ ...form, memo: e.target.value })} maxLength={1000} rows={4} placeholder="예: 10월 3주 방문 체험 진행, 샤오홍슈 노출 중심. 좋아요 상위 노트 3건은 매장 계정에 리포스트 완료." className={`mt-1 ${INPUT} resize-y`} />
        </div>
      </div>
      {mode === "edit" && (
        <div className="mt-5 flex justify-end">
          <button type="button" onClick={save} disabled={pending || !form.title.trim()} className="btn-neon rounded-full px-5 py-2 text-xs font-bold disabled:opacity-50">
            {pending ? "저장 중…" : "저장"}
          </button>
        </div>
      )}
    </section>
  );

  return (
    <div className="mt-8 space-y-6">
      {mode === "edit" && url && (
        <section className={`rounded-3xl p-6 ${justCreated ? "border border-accent/30 bg-accent-soft/30" : "glass-card"}`}>
          {justCreated && <div className="text-[11px] font-semibold uppercase tracking-wider text-accent-ink">보고서가 만들어졌어요</div>}
          <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-semibold"><Link2 className="size-4" /> 공유 링크</div>
              <div className="mt-1 truncate font-mono text-xs text-muted-foreground">{url}</div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={copy} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-2 text-xs font-medium hover:bg-muted">
                {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />} {copied ? "복사됨" : "링크 복사"}
              </button>
              <a href={url} target="_blank" rel="noreferrer" className="btn-neon inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold">
                보고서 열기 <ExternalLink className="size-3.5" />
              </a>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3 text-xs">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={isPublic} onChange={(e) => togglePublic(e.target.checked)} className="size-3.5 accent-accent" />
              링크로 열람 허용 {isPublic ? "(켜짐 — 링크를 아는 사람은 누구나 볼 수 있어요)" : "(꺼짐 — 링크가 열리지 않아요)"}
            </label>
            <button type="button" onClick={remove} disabled={pending} className="inline-flex items-center gap-1 text-muted-foreground hover:text-danger disabled:opacity-50">
              <Trash2 className="size-3.5" /> 보고서 삭제
            </button>
          </div>
        </section>
      )}

      {msg && <p role="status" className={`text-sm ${msg.kind === "ok" ? "text-success" : "text-danger"}`}>{msg.text}</p>}

      <div className="grid gap-6 lg:grid-cols-[1fr_1.25fr]">
        {formCard}
        <div className="space-y-6">
          {uploadCard}
          {mode === "create" && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl glass-card px-6 py-4">
              <p className="text-sm text-muted-foreground">
                {preview ? `${validRows.length}건의 리뷰 링크로 보고서를 만듭니다.` : "엑셀을 올려 미리보기를 확인한 뒤 만들 수 있어요."}
              </p>
              <button type="button" onClick={create} disabled={pending || !preview || validRows.length === 0 || !form.title.trim()} className="btn-neon rounded-full px-6 py-2.5 text-sm font-bold disabled:opacity-50">
                {pending ? "만드는 중…" : "보고서 만들기"}
              </button>
            </div>
          )}
          {mode === "edit" && (
            <section className="rounded-3xl glass-card p-6">
              <div className="flex items-baseline justify-between">
                <h2 className="text-lg font-semibold tracking-tight">등록된 리뷰 링크</h2>
                <span className="text-xs text-muted-foreground">{existingRows.length}건</span>
              </div>
              {existingRows.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">등록된 행이 없습니다. 위에서 엑셀을 올려 채워주세요.</p>
              ) : (
                <div className="mt-4 max-h-[480px] overflow-auto">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                        <th className="pb-2 pr-3 font-medium">#</th><th className="pb-2 pr-3 font-medium">채널</th><th className="pb-2 pr-3 font-medium">크리에이터</th><th className="pb-2 pr-3 font-medium">리뷰</th><th className="pb-2 pr-3 font-medium">팔로워</th><th className="pb-2 pr-3 font-medium">좋아요</th><th className="pb-2 pr-3 font-medium">게시일</th><th className="pb-2 font-medium"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {existingRows.map((r) => (
                        <tr key={r.id} className="border-b border-border/60 last:border-0">
                          <td className="py-2 pr-3 tabular-nums text-muted-foreground">{r.seq}</td>
                          <td className="py-2 pr-3 whitespace-nowrap">{channelLabel(r.channel)}</td>
                          <td className="py-2 pr-3 max-w-[160px] truncate">
                            {r.creator_url ? <a href={r.creator_url} target="_blank" rel="noreferrer" className="underline underline-offset-2">{r.creator_name ?? hostOf(r.creator_url)}</a> : (r.creator_name ?? "—")}
                          </td>
                          <td className="py-2 pr-3"><a href={r.post_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs underline underline-offset-2">보기 <ExternalLink className="size-3" /></a></td>
                          <td className="py-2 pr-3 tabular-nums">{fmt(r.followers)}</td>
                          <td className="py-2 pr-3 tabular-nums">{fmt(r.likes)}</td>
                          <td className="py-2 pr-3 tabular-nums text-muted-foreground">{r.posted_at ?? "—"}</td>
                          <td className="py-2 text-right"><button type="button" onClick={() => removeRow(r.id)} disabled={pending} aria-label="행 삭제" className="text-muted-foreground hover:text-danger"><Trash2 className="size-3.5" /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
