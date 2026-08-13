"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, Clock3, ExternalLink, Loader2, Send, Upload } from "lucide-react";
import { submitContent } from "./actions";

const STATUS_LABEL: Record<string, { label: string; tone: string }> = {
  pending: { label: "응모 대기", tone: "bg-muted text-foreground" },
  selected: { label: "선정됨", tone: "bg-success-soft text-success" },
  rejected: { label: "미선정", tone: "bg-danger-soft text-danger" },
  cancelled: { label: "취소", tone: "bg-muted text-muted-foreground" },
  completed: { label: "체험 완료", tone: "bg-foreground text-background" },
};

type SubmissionInfo = {
  id: string;
  status: string;
  contentUrl: string;
  note: string | null;
  feedback: string | null;
  submittedAt: string;
} | null;

export function SubmissionCard({
  applicationId,
  applicationStatus,
  campaignId,
  campaignTitle,
  businessName,
  pointAmount,
  submission,
}: {
  applicationId: string;
  applicationStatus: string;
  campaignId: string;
  campaignTitle: string;
  businessName: string;
  pointAmount: number;
  submission: SubmissionInfo;
}) {
  const [sub, setSub] = useState(submission);
  const appStatus = applicationStatus;
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const info = STATUS_LABEL[appStatus] ?? STATUS_LABEL.pending;
  const needsFirstSubmit = appStatus === "selected" && !sub;
  const needsResubmit = sub?.status === "revision_requested";
  const waitingReview = sub?.status === "submitted";
  const approved = sub?.status === "approved" || appStatus === "completed";

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await submitContent(applicationId, url, note);
        if (result.ok) {
          setSub({
            id: sub?.id ?? "local",
            status: "submitted",
            contentUrl: url,
            note: note.trim() || null,
            feedback: sub?.feedback ?? null,
            submittedAt: new Date().toISOString(),
          });
          setFormOpen(false);
          setUrl("");
          setNote("");
        } else {
          setError(result.error);
        }
      } catch {
        setError("제출 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
      }
    });
  }

  return (
    <div className="rounded-2xl glass-card p-4">
      <div className="flex items-center justify-between gap-4">
        <Link href={`/dashboard/campaigns/${campaignId}`} className="min-w-0 flex-1 group">
          <div className="line-clamp-1 text-sm font-medium group-hover:underline">
            {campaignTitle}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">{businessName}</div>
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          {(appStatus === "selected" || appStatus === "completed") && (
            <Link
              href={`/dashboard/messages/${applicationId}`}
              className="rounded-full border border-border bg-background px-3.5 py-1.5 text-[11px] font-medium hover:bg-muted"
            >
              메시지
            </Link>
          )}
          <span className={`rounded-full px-3 py-1 text-[11px] font-medium ${info.tone}`}>
            {info.label}
          </span>
        </div>
      </div>

      {/* 승인 완료 */}
      {approved && (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-accent-soft px-3 py-2.5 text-xs text-accent-ink">
          <CheckCircle2 className="size-4 shrink-0" />
          <span>
            콘텐츠 승인 완료 — <strong>{pointAmount.toLocaleString()}P</strong>가 지급되었습니다.
          </span>
        </div>
      )}

      {/* 검수 대기 */}
      {waitingReview && !approved && (
        <div className="mt-3 rounded-xl bg-muted/50 px-3 py-2.5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock3 className="size-4 shrink-0" />
            콘텐츠 검수 대기 중 — 광고주가 확인하면 포인트가 지급됩니다.
          </div>
          <a
            href={sub!.contentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-xs text-foreground underline underline-offset-2"
          >
            제출한 콘텐츠 보기 <ExternalLink className="size-3" />
          </a>
        </div>
      )}

      {/* 수정 요청 피드백 */}
      {needsResubmit && (
        <div className="mt-3 rounded-xl border border-accent/30 bg-accent-soft px-3 py-2.5 text-xs text-accent-ink">
          <div className="font-semibold">광고주가 수정을 요청했어요</div>
          {sub?.feedback && <p className="mt-1 whitespace-pre-wrap">{sub.feedback}</p>}
        </div>
      )}

      {/* 제출/재제출 폼 */}
      {(needsFirstSubmit || needsResubmit) && (
        <div className="mt-3">
          {!formOpen ? (
            <button
              onClick={() => setFormOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-xs font-medium text-background hover:bg-foreground/90"
            >
              <Upload className="size-3.5" />
              {needsResubmit ? "콘텐츠 다시 제출하기" : "콘텐츠 제출하기"}
            </button>
          ) : (
            <div className="rounded-xl border border-border p-3">
              <label className="block text-[11px] font-medium text-muted-foreground">
                발행한 콘텐츠 링크 (인스타그램·블로그·유튜브 등)
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://instagram.com/p/..."
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
              />
              <label className="mt-3 block text-[11px] font-medium text-muted-foreground">
                메모 (선택)
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="광고주에게 전달할 내용이 있다면 적어주세요."
                className="mt-1 w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
              />
              <div className="mt-3 flex justify-end gap-2">
                <button
                  onClick={() => {
                    setFormOpen(false);
                    setError(null);
                  }}
                  disabled={pending}
                  className="rounded-full border border-border px-4 py-2 text-xs font-medium hover:bg-muted disabled:opacity-50"
                >
                  취소
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={pending || !url.trim()}
                  className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-xs font-medium text-background hover:bg-foreground/90 disabled:opacity-50"
                >
                  {pending ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Send className="size-3.5" />
                  )}
                  제출
                </button>
              </div>
            </div>
          )}
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
