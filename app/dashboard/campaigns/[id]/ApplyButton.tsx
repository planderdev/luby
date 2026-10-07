"use client";
import { trackClient } from "@/lib/analytics";

import { useState, useTransition } from "react";
import { Loader2, Check, X, Sparkles } from "lucide-react";
import { applyToCampaign, cancelApplication } from "./actions";
import { suggestApplicationMessage } from "./ai-apply-actions";
import { dashboardDict } from "@/lib/i18n/app/dashboard";
import type { Locale } from "@/lib/i18n/config";

const STATUS_TONE: Record<string, string> = {
  pending: "bg-muted text-foreground",
  selected: "bg-accent-soft text-accent-ink",
  rejected: "bg-muted text-muted-foreground",
  cancelled: "bg-muted text-muted-foreground",
  completed: "bg-foreground text-background",
};

export function ApplyButton({
  campaignId,
  disabled,
  initialStatus,
  locale = "ko",
}: {
  campaignId: string;
  disabled?: boolean;
  initialStatus: string | null;
  locale?: Locale;
}) {
  const t = dashboardDict[locale].apply;
  const [status, setStatus] = useState<string | null>(initialStatus);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [drafting, setDrafting] = useState(false);

  async function draftWithAI() {
    setError(null);
    setDrafting(true);
    const r = await suggestApplicationMessage(campaignId, locale);
    setDrafting(false);
    if (r.ok) setMessage(r.message);
    else setError(r.error);
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await applyToCampaign(campaignId, message, locale);
      if (result.ok) {
        trackClient("application_sent");
        setStatus("pending");
        setShowForm(false);
        setMessage("");
      } else {
        setError(result.error);
      }
    });
  }

  function cancel() {
    setError(null);
    startTransition(async () => {
      const result = await cancelApplication(campaignId, locale);
      if (result.ok) {
        setStatus("cancelled");
      } else {
        setError(result.error);
      }
    });
  }

  if (disabled) {
    return (
      <span className="rounded-full border border-border bg-muted px-4 py-2 text-xs text-muted-foreground">
        {t.approvalRequired}
      </span>
    );
  }

  if (status && status !== "cancelled") {
    const tone = STATUS_TONE[status] ?? STATUS_TONE.pending;
    return (
      <div className="flex items-center gap-2">
        <span className={`rounded-full px-4 py-2 text-xs font-medium ${tone}`}>
          {t.status[status] ?? t.status.pending}
        </span>
        {status === "pending" && (
          <button
            onClick={cancel}
            disabled={pending}
            className="rounded-full border border-border bg-background px-4 py-2 text-xs text-muted-foreground hover:text-foreground"
          >
            {t.cancel}
          </button>
        )}
      </div>
    );
  }

  if (showForm) {
    return (
      <div className="w-full max-w-md rounded-3xl glass-card p-5">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-sm font-semibold">{t.msgTitle}</h4>
          <button
            type="button"
            onClick={draftWithAI}
            disabled={drafting || pending}
            className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1.5 text-xs font-medium text-accent-ink hover:bg-accent/20 disabled:opacity-60"
            title={t.aiTitle}
          >
            {drafting ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
            {drafting ? t.drafting : t.aiDraft}
          </button>
        </div>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t.placeholder}
          rows={4}
          className="mt-3 w-full resize-none rounded-2xl glass-card px-4 py-3 text-sm outline-none focus:border-foreground"
        />
        {error && (
          <div className="mt-2 rounded-xl border border-accent/30 bg-accent-soft px-3 py-2 text-xs text-accent-ink">
            {error}
          </div>
        )}
        <div className="mt-3 flex justify-end gap-2">
          <button
            onClick={() => setShowForm(false)}
            disabled={pending}
            className="rounded-full border border-border bg-background px-4 py-2 text-xs"
          >
            <X className="size-3.5" />
          </button>
          <button
            onClick={submit}
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2 text-xs font-medium text-background"
          >
            {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
            {t.submit}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowForm(true)}
      className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background"
    >
      {t.cta}
    </button>
  );
}
