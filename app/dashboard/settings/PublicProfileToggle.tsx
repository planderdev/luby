"use client";

import { useState, useTransition } from "react";
import { Globe, Link2, Check, Loader2, ExternalLink } from "lucide-react";
import { setPublicProfile } from "./actions";
import { dashboardDict } from "@/lib/i18n/app/dashboard";
import type { Locale } from "@/lib/i18n/config";

export function PublicProfileToggle({ userId, initial, approved, locale = "ko" }: { userId: string; initial: boolean; approved: boolean; locale?: Locale }) {
  const t = dashboardDict[locale].settings.publicProfile;
  const [on, setOn] = useState(initial);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // 서버/클라이언트 렌더가 같아야 한다 — window 로 만들면 하이드레이션 텍스트 불일치(React #418)가 난다
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "https://luby.im";
  const url = `${origin}/p/${userId}`;

  function toggle() {
    const next = !on;
    setOn(next);
    setError(null);
    startTransition(async () => {
      const r = await setPublicProfile(next, locale);
      if (!r.ok) {
        setOn(!next);
        setError(r.error);
      }
    });
  }
  async function copy() {
    try { await navigator.clipboard.writeText(url); } catch { /* noop */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <section id="public" className="scroll-mt-24 rounded-3xl glass-card p-6 lg:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold"><Globe className="size-4" /> {t.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t.desc}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label={t.title}
          onClick={toggle}
          disabled={pending || !approved}
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? "bg-accent" : "bg-muted"} disabled:opacity-50`}
        >
          <span className={`absolute top-0.5 size-5 rounded-full bg-background shadow transition-transform ${on ? "translate-x-5" : "translate-x-0.5"}`} />
        </button>
      </div>
      {!approved && <p className="mt-3 text-xs text-muted-foreground">{t.afterApproval}</p>}
      {on && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <code className="rounded-xl bg-muted px-3 py-2 text-xs">{url}</code>
          <button type="button" onClick={copy} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs hover:bg-muted">
            {copied ? <Check className="size-3.5 text-success" /> : <Link2 className="size-3.5" />} {copied ? t.copied : t.copy}
          </button>
          <a href={`/p/${userId}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ExternalLink className="size-3.5" /> {t.preview}
          </a>
          <span className="text-[11px] text-muted-foreground">
            {t.abroad} <a href={`/en/p/${userId}`} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">EN</a> · <a href={`/zh/p/${userId}`} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">CN</a>
          </span>
        </div>
      )}
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
      {pending && <Loader2 className="mt-2 size-4 animate-spin text-muted-foreground" />}
    </section>
  );
}
