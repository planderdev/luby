"use client";

import { useState, useTransition } from "react";
import { Check, X, Loader2, ExternalLink, CheckCircle2, MessageSquareWarning } from "lucide-react";
import { selectApplicant, approveSubmission, requestSubmissionRevision } from "./actions";

const STATUS_LABEL: Record<string, { label: string; tone: string }> = {
  pending: { label: "대기", tone: "bg-warning-soft text-warning" },
  selected: { label: "선정", tone: "bg-success-soft text-success" },
  rejected: { label: "미선정", tone: "bg-danger-soft text-danger" },
  cancelled: { label: "취소됨", tone: "bg-muted text-muted-foreground" },
  completed: { label: "완료", tone: "bg-foreground text-background" },
};

type SubmissionInfo = {
  id: string;
  status: string;
  contentUrl: string;
  note: string | null;
  feedback: string | null;
  submittedAt: string;
} | null;

export function ApplicantRow({
  applicationId,
  campaignId,
  status,
  message,
  createdAt,
  name,
  region,
  points,
  channels,
  submission = null,
}: {
  applicationId: string;
  campaignId: string;
  status: string;
  message: string | null;
  createdAt: string;
  name: string;
  region: string;
  points: number;
  channels: { handle: string; followers: number }[];
  submission?: SubmissionInfo;
}) {
  const [currentStatus, setCurrentStatus] = useState(status);
  const [sub, setSub] = useState(submission);
  const [error, setError] = useState<string | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [pending, startTransition] = useTransition();

  function decide(decision: "selected" | "rejected") {
    setError(null);
    startTransition(async () => {
      const result = await selectApplicant(campaignId, applicationId, decision);
      if (result.ok) {
        setCurrentStatus(decision);
      } else {
        setError(result.error);
      }
    });
  }

  function approve() {
    if (!sub) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await approveSubmission(campaignId, sub.id);
        if (result.ok) {
          setSub({ ...sub, status: "approved" });
          setCurrentStatus("completed");
        } else {
          setError(result.error);
        }
      } catch {
        setError("승인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
      }
    });
  }

  function requestRevision() {
    if (!sub) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await requestSubmissionRevision(campaignId, sub.id, feedback);
        if (result.ok) {
          setSub({ ...sub, status: "revision_requested", feedback: feedback.trim() });
          setFeedbackOpen(false);
          setFeedback("");
        } else {
          setError(result.error);
        }
      } catch {
        setError("수정 요청 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
      }
    });
  }

  const info = STATUS_LABEL[currentStatus] ?? STATUS_LABEL.pending;
  const reviewable = sub?.status === "submitted";
  const approved = sub?.status === "approved";
  const revisionRequested = sub?.status === "revision_requested";

  return (
    <div className="rounded-2xl glass-card p-4">
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-foreground text-background text-sm font-semibold">
          {name.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">{name}</span>
            <span className="text-xs text-muted-foreground">{region}</span>
            <span className="text-xs text-muted-foreground">· {points.toLocaleString()}P</span>
          </div>
          {channels.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {channels.map((c, i) => (
                <span key={i}>
                  {c.handle} ({c.followers.toLocaleString()})
                </span>
              ))}
            </div>
          )}
          {message && (
            <div className="mt-2 rounded-xl bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              {message}
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className={`rounded-full px-3 py-1 text-[11px] font-medium ${info.tone}`}>
            {info.label}
          </span>
          {currentStatus === "pending" && (
            <div className="flex gap-1">
              <button
                onClick={() => decide("rejected")}
                disabled={pending}
                className="inline-flex size-8 items-center justify-center rounded-full border border-border bg-background hover:bg-muted disabled:opacity-50"
                title="미선정"
              >
                {pending ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-3.5" />}
              </button>
              <button
                onClick={() => decide("selected")}
                disabled={pending}
                className="inline-flex size-8 items-center justify-center rounded-full bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50"
                title="선정"
              >
                {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 콘텐츠 검수 영역 */}
      {sub && (
        <div className="mt-3 rounded-xl border border-border bg-muted/30 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-medium">
              {approved ? (
                <span className="inline-flex items-center gap-1 text-accent-ink">
                  <CheckCircle2 className="size-3.5" /> 콘텐츠 승인 완료 · 포인트 지급됨
                </span>
              ) : revisionRequested ? (
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <MessageSquareWarning className="size-3.5" /> 수정 요청됨 · 재제출 대기 중
                </span>
              ) : (
                <span>제출된 콘텐츠 — 검수해주세요</span>
              )}
            </div>
            <a
              href={sub.contentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs underline underline-offset-2 hover:text-foreground"
            >
              콘텐츠 보기 <ExternalLink className="size-3" />
            </a>
          </div>

          {sub.note && (
            <p className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">{sub.note}</p>
          )}
          {revisionRequested && sub.feedback && (
            <p className="mt-2 rounded-lg bg-background px-3 py-2 text-xs text-muted-foreground">
              보낸 피드백: {sub.feedback}
            </p>
          )}

          {reviewable && !feedbackOpen && (
            <div className="mt-3 flex justify-end gap-2">
              <button
                onClick={() => setFeedbackOpen(true)}
                disabled={pending}
                className="rounded-full border border-border bg-background px-4 py-2 text-xs font-medium hover:bg-muted disabled:opacity-50"
              >
                수정 요청
              </button>
              <button
                onClick={approve}
                disabled={pending}
                className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-xs font-medium text-background hover:bg-foreground/90 disabled:opacity-50"
              >
                {pending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Check className="size-3.5" />
                )}
                승인 · 포인트 지급
              </button>
            </div>
          )}

          {reviewable && feedbackOpen && (
            <div className="mt-3">
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={2}
                placeholder="어떤 부분을 수정해야 하는지 인플루언서에게 전달할 내용을 적어주세요."
                className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none focus:border-foreground"
              />
              <div className="mt-2 flex justify-end gap-2">
                <button
                  onClick={() => {
                    setFeedbackOpen(false);
                    setError(null);
                  }}
                  disabled={pending}
                  className="rounded-full border border-border bg-background px-4 py-2 text-xs font-medium hover:bg-muted disabled:opacity-50"
                >
                  취소
                </button>
                <button
                  onClick={requestRevision}
                  disabled={pending || !feedback.trim()}
                  className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-xs font-medium text-background hover:bg-foreground/90 disabled:opacity-50"
                >
                  {pending ? <Loader2 className="size-3.5 animate-spin" /> : null}
                  수정 요청 보내기
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
