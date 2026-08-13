"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, X, Loader2, ExternalLink } from "lucide-react";
import { decideCampaign } from "../actions";

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
}: {
  campaignId: string;
  title: string;
  businessName: string;
  advertiserName: string;
  advertiserEmail: string;
  recruitStart: string;
  recruitEnd: string;
}) {
  const [hidden, setHidden] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function decide(decision: "open" | "rejected") {
    setError(null);
    startTransition(async () => {
      const result = await decideCampaign(campaignId, decision);
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
            onClick={() => decide("rejected")}
            disabled={pending}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-4 py-2 text-xs hover:bg-muted disabled:opacity-50"
          >
            {pending ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-3.5" />}
            반려
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
      {error && (
        <div className="mt-2 rounded-xl border border-accent/30 bg-accent-soft px-3 py-2 text-xs text-accent-ink">
          {error}
        </div>
      )}
    </div>
  );
}
