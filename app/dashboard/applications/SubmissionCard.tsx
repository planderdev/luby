"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, Clock3, ExternalLink, Loader2, Send, Upload } from "lucide-react";
import { submitContent } from "./actions";
import { dashboardDict } from "@/lib/i18n/app/dashboard";
import type { Locale } from "@/lib/i18n/config";

const STATUS_TONE: Record<string, string> = {
  pending: "bg-muted text-foreground",
  selected: "bg-success-soft text-success",
  rejected: "bg-danger-soft text-danger",
  cancelled: "bg-muted text-muted-foreground",
  completed: "bg-foreground text-background",
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
  locale = "ko",
}: {
  applicationId: string;
  applicationStatus: string;
  campaignId: string;
  campaignTitle: string;
  businessName: string;
  pointAmount: number;
  submission: SubmissionInfo;
  locale?: Locale;
}) {
  const t = dashboardDict[locale].applications;
  const [sub, setSub] = useState(submission);
  const appStatus = applicationStatus;
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const tone = STATUS_TONE[appStatus] ?? STATUS_TONE.pending;
  const needsFirstSubmit = appStatus === "selected" && !sub;
  const needsResubmit = sub?.status === "revision_requested";
  const waitingReview = sub?.status === "submitted";
  const approved = sub?.status === "approved" || appStatus === "completed";

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await submitContent(applicationId, url, note, locale);
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
        setError(t.errSubmit);
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
              {t.message}
            </Link>
          )}
          <span className={`rounded-full px-3 py-1 text-[11px] font-medium ${tone}`}>
            {t.status[appStatus] ?? t.status.pending}
          </span>
        </div>
      </div>

      {/* 승인 완료 */}
      {approved && (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-accent-soft px-3 py-2.5 text-xs text-accent-ink">
          <CheckCircle2 className="size-4 shrink-0" />
          <span>{t.approved(`${pointAmount.toLocaleString()}P`)}</span>
        </div>
      )}

      {/* 검수 대기 */}
      {waitingReview && !approved && (
        <div className="mt-3 rounded-xl bg-muted/50 px-3 py-2.5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock3 className="size-4 shrink-0" />
            {t.waiting}
          </div>
          <a
            href={sub!.contentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-xs text-foreground underline underline-offset-2"
          >
            {t.viewSubmitted} <ExternalLink className="size-3" />
          </a>
        </div>
      )}

      {/* 수정 요청 피드백 */}
      {needsResubmit && (
        <div className="mt-3 rounded-xl border border-accent/30 bg-accent-soft px-3 py-2.5 text-xs text-accent-ink">
          <div className="font-semibold">{t.revisionTitle}</div>
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
              {needsResubmit ? t.resubmitTitle : t.submitTitle}
            </button>
          ) : (
            <div className="rounded-xl border border-border p-3">
              <label className="block text-[11px] font-medium text-muted-foreground">
                {t.urlLabel}
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://instagram.com/p/..."
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
              />
              <label className="mt-3 block text-[11px] font-medium text-muted-foreground">
                {t.noteLabel}
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder={t.notePlaceholder}
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
                  {t.cancel}
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
                  {t.submit}
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
