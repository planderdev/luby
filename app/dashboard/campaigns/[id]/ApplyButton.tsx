"use client";
import { trackClient } from "@/lib/analytics";

import { useState, useTransition } from "react";
import { Loader2, Check, X } from "lucide-react";
import { applyToCampaign, cancelApplication } from "./actions";

const STATUS_LABEL: Record<string, { label: string; tone: string }> = {
  pending: { label: "응모 대기", tone: "bg-muted text-foreground" },
  selected: { label: "선정됨", tone: "bg-accent-soft text-accent-ink" },
  rejected: { label: "미선정", tone: "bg-muted text-muted-foreground" },
  cancelled: { label: "응모 취소됨", tone: "bg-muted text-muted-foreground" },
  completed: { label: "체험 완료", tone: "bg-foreground text-background" },
};

export function ApplyButton({
  campaignId,
  disabled,
  initialStatus,
}: {
  campaignId: string;
  disabled?: boolean;
  initialStatus: string | null;
}) {
  const [status, setStatus] = useState<string | null>(initialStatus);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await applyToCampaign(campaignId, message);
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
      const result = await cancelApplication(campaignId);
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
        승인 후 응모 가능
      </span>
    );
  }

  if (status && status !== "cancelled") {
    const info = STATUS_LABEL[status] ?? STATUS_LABEL.pending;
    return (
      <div className="flex items-center gap-2">
        <span className={`rounded-full px-4 py-2 text-xs font-medium ${info.tone}`}>
          {info.label}
        </span>
        {status === "pending" && (
          <button
            onClick={cancel}
            disabled={pending}
            className="rounded-full border border-border bg-background px-4 py-2 text-xs text-muted-foreground hover:text-foreground"
          >
            응모 취소
          </button>
        )}
      </div>
    );
  }

  if (showForm) {
    return (
      <div className="w-full max-w-md rounded-3xl glass-card p-5">
        <h4 className="text-sm font-semibold">응모 메시지 (선택)</h4>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="광고주에게 어필할 내용이 있으면 작성해주세요."
          rows={3}
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
            응모하기
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
      이 캠페인에 응모하기
    </button>
  );
}
