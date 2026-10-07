"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Loader2, X } from "lucide-react";
import { respondInvitation } from "../creators/actions";
import { dashboardDict } from "@/lib/i18n/app/dashboard";
import type { Locale } from "@/lib/i18n/config";

export function InvitationCard({
  id,
  campaignId,
  campaignTitle,
  businessName,
  advertiserId,
  message,
  pointAmount,
  recruitEnd,
  status,
  locale = "ko",
}: {
  id: string;
  campaignId: string;
  campaignTitle: string;
  businessName: string;
  advertiserId: string;
  message: string | null;
  pointAmount: number;
  recruitEnd: string;
  status: string;
  locale?: Locale;
}) {
  const t = dashboardDict[locale].invitations;
  const [current, setCurrent] = useState(status);
  const [pending, setPending] = useState<"accept" | "decline" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function respond(accept: boolean) {
    setPending(accept ? "accept" : "decline");
    setError(null);
    const r = await respondInvitation(id, accept, locale);
    if (r.ok) setCurrent(accept ? "accepted" : "declined");
    else setError(r.error);
    setPending(null);
  }

  const end = new Date(recruitEnd);
  const closed = end.getTime() < Date.now();

  return (
    <div className="rounded-2xl glass-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Link
            href={`/dashboard/campaigns/${campaignId}`}
            className="line-clamp-1 text-sm font-semibold hover:underline underline-offset-2"
          >
            {campaignTitle}
          </Link>
          <div className="mt-1 text-xs text-muted-foreground">
            <Link
              href={`/dashboard/advertisers/${advertiserId}`}
              className="hover:text-foreground hover:underline underline-offset-2"
              title={t.advertiserProfile}
            >
              {businessName}
            </Link>{" "}
            · {pointAmount.toLocaleString()}P · {t.deadline(end.toLocaleDateString(t.dateLocale))}
          </div>
          {message && (
            <p className="mt-3 rounded-xl bg-muted/50 px-3 py-2 text-xs text-foreground">
              💌 {message}
            </p>
          )}
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-medium ${
            current === "accepted"
              ? "bg-success-soft text-success"
              : current === "declined"
                ? "bg-muted text-muted-foreground"
                : "bg-warning-soft text-warning"
          }`}
        >
          {current === "accepted" ? t.accepted : current === "declined" ? t.declined : t.pending}
        </span>
      </div>

      {current === "pending" && (
        <div className="mt-4 flex items-center justify-end gap-2">
          {closed && (
            <span className="mr-auto text-[11px] text-muted-foreground">{t.closed}</span>
          )}
          <button
            type="button"
            onClick={() => respond(false)}
            disabled={pending !== null}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-4 py-2 text-xs font-medium hover:bg-muted disabled:opacity-50"
          >
            {pending === "decline" ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-3.5" />}
            {t.decline}
          </button>
          <button
            type="button"
            onClick={() => respond(true)}
            disabled={pending !== null || closed}
            className="btn-neon inline-flex items-center gap-1 rounded-full px-4 py-2 text-xs font-bold disabled:opacity-50"
          >
            {pending === "accept" ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
            {t.accept}
          </button>
        </div>
      )}
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </div>
  );
}
