"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, X, Loader2, ExternalLink, ShieldCheck, ShieldAlert, ShieldX, Sparkles, RotateCcw } from "lucide-react";
import { decideCampaign, precheckCampaignAction } from "../actions";
import type { Precheck } from "@/lib/ai/campaign-precheck";

function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function CampaignDecisionRow({
  campaignId,
  title,
  businessName,
  advertiserName,
  advertiserEmail,
  recruitStart,
  recruitEnd,
  initialPrecheck = null,
  initialCheckedAt = null,
  reviewRound = 0,
  previousNote = null,
}: {
  campaignId: string;
  title: string;
  businessName: string;
  advertiserName: string;
  advertiserEmail: string;
  recruitStart: string;
  recruitEnd: string;
  initialPrecheck?: Precheck | null;
  initialCheckedAt?: string | null;
  /** 검수 회차 (2 이상이면 재신청) */
  reviewRound?: number;
  /** 직전 반려 사유 (재신청 시 참고) */
  previousNote?: string | null;
}) {
  const [hidden, setHidden] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [precheck, setPrecheck] = useState<Precheck | null>(initialPrecheck);
  const [checkedAt, setCheckedAt] = useState<string | null>(initialCheckedAt);
  const [checking, setChecking] = useState(false);
  const [showIssues, setShowIssues] = useState(!!initialPrecheck && initialPrecheck.verdict !== "ok");

  async function runPrecheck(force: boolean) {
    setError(null);
    setChecking(true);
    const r = await precheckCampaignAction(campaignId, force);
    setChecking(false);
    if (r.ok) {
      setPrecheck(r.result);
      setCheckedAt(r.checkedAt);
      setShowIssues(true);
    } else setError(r.error);
  }

  const [rejectOpen, setRejectOpen] = useState(false);
  const [note, setNote] = useState("");

  function openReject() {
    // AI 사전 점검의 수정 제안을 초안으로
    if (!note && precheck?.issues?.length) {
      setNote(precheck.issues.map((it, i) => `${i + 1}. [${it.area}] ${it.fix}`).join("\n"));
    }
    setRejectOpen(true);
  }

  function decide(decision: "open" | "rejected") {
    setError(null);
    startTransition(async () => {
      const result = await decideCampaign(campaignId, decision, decision === "rejected" ? note : undefined);
      if (result.ok) {
        setHidden(true);
      } else {
        setError(result.error);
      }
    });
  }

  if (hidden) return null;

  return (
    <div className="rounded-2xl glass-card p-4">
      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">{title}</span>
            {reviewRound > 1 && <span className="rounded-full bg-warning-soft px-2 py-0.5 text-[11px] font-medium text-warning">재신청 {reviewRound}차</span>}
            <Link
              href={`/dashboard/campaigns/${campaignId}`}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              상세보기
              <ExternalLink className="size-3" />
            </Link>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {businessName} · {advertiserName} ({advertiserEmail})
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            모집 {fmtDate(recruitStart)} ~ {fmtDate(recruitEnd)}
          </div>
        </div>

        <div className="flex shrink-0 gap-1">
          <button
            onClick={openReject}
            disabled={pending}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-4 py-2 text-xs hover:bg-muted disabled:opacity-50"
          >
            <X className="size-3.5" />
            반려 (수정 요청)
          </button>
          <button
            onClick={() => decide("open")}
            disabled={pending}
            className="inline-flex items-center gap-1 rounded-full bg-foreground px-4 py-2 text-xs font-medium text-background disabled:opacity-50"
          >
            {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
            승인
          </button>
        </div>
      </div>
      {previousNote && reviewRound > 1 && (
        <div className="mt-3 rounded-2xl bg-muted/50 px-4 py-3 text-xs">
          <div className="font-semibold text-muted-foreground">직전 반려 사유</div>
          <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{previousNote}</p>
        </div>
      )}
      {rejectOpen && (
        <div className="mt-3 rounded-2xl border border-danger/30 bg-danger-soft/30 p-4">
          <div className="text-sm font-semibold">반려 — 광고주에게 전달할 수정 요청 사항</div>
          <p className="mt-1 text-xs text-muted-foreground">광고주는 이 내용을 알림·이메일로 받고, 캠페인을 수정한 뒤 "다시 검수 요청"을 누릅니다. AI 사전 점검 결과가 있으면 초안으로 채워져요.</p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={5}
            placeholder={"예)\n1. [광고 표기] 모든 채널 미션에 #광고 #협찬 표기를 필수로 추가해 주세요.\n2. [제공 내역] 항공 출발지·자기부담금 유무를 명시해 주세요."}
            className="mt-2 w-full resize-y rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-foreground"
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">{note.trim().length}자 (10자 이상)</span>
            <div className="flex gap-2">
              <button type="button" onClick={() => setRejectOpen(false)} className="rounded-full px-3 py-1.5 text-xs hover:bg-muted">닫기</button>
              <button type="button" onClick={() => decide("rejected")} disabled={pending || note.trim().length < 10} className="inline-flex items-center gap-1.5 rounded-full bg-danger px-4 py-1.5 text-xs font-medium text-white disabled:opacity-50">
                {pending ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-3.5" />} 반려하고 수정 요청 보내기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI 사전 점검 */}
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
        {precheck ? (
          <button
            type="button"
            onClick={() => setShowIssues((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
              precheck.verdict === "ok"
                ? "bg-success-soft text-success"
                : precheck.verdict === "caution"
                  ? "bg-warning-soft text-warning"
                  : "bg-danger-soft text-danger"
            }`}
          >
            {precheck.verdict === "ok" ? <ShieldCheck className="size-3.5" /> : precheck.verdict === "caution" ? <ShieldAlert className="size-3.5" /> : <ShieldX className="size-3.5" />}
            AI 점검: {precheck.verdict === "ok" ? "이상 없음" : precheck.verdict === "caution" ? "수정 권장" : "승인 보류 권장"}
            {precheck.issues.length > 0 && ` · 이슈 ${precheck.issues.length}`}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => runPrecheck(false)}
            disabled={checking || pending}
            className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent-ink hover:bg-accent/20 disabled:opacity-60"
          >
            {checking ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
            {checking ? "점검 중…" : "AI 사전 점검"}
          </button>
        )}
        {precheck && (
          <>
            <span className="text-[11px] text-muted-foreground">
              {checkedAt ? new Date(checkedAt).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
            </span>
            <button
              type="button"
              onClick={() => runPrecheck(true)}
              disabled={checking}
              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
              title="다시 점검"
            >
              {checking ? <Loader2 className="size-3 animate-spin" /> : <RotateCcw className="size-3" />} 다시
            </button>
          </>
        )}
      </div>
      {precheck && showIssues && (
        <div className="mt-2 rounded-2xl bg-muted/50 p-3 text-xs">
          <p className="leading-relaxed">{precheck.summary}</p>
          {precheck.issues.length > 0 && (
            <ul className="mt-2 space-y-1.5">
              {precheck.issues.map((it, i) => (
                <li key={i} className="rounded-xl bg-background px-3 py-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                        it.severity === "high" ? "bg-danger-soft text-danger" : it.severity === "medium" ? "bg-warning-soft text-warning" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {it.severity === "high" ? "높음" : it.severity === "medium" ? "중간" : "낮음"}
                    </span>
                    <span className="font-medium">{it.area}</span>
                  </div>
                  <div className="mt-1 text-muted-foreground">{it.detail}</div>
                  <div className="mt-1">💡 {it.fix}</div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-[10px] text-muted-foreground">AI 참고 의견입니다 — 최종 승인/반려는 운영자 판단.</p>
        </div>
      )}
      {error && (
        <div className="mt-2 rounded-xl border border-accent/30 bg-accent-soft px-3 py-2 text-xs text-accent-ink">
          {error}
        </div>
      )}
    </div>
  );
}
