"use client";

import { useState, useTransition } from "react";
import { Loader2, Mail } from "lucide-react";
import { updateEmailPrefs } from "./actions";
import { dashboardDict } from "@/lib/i18n/app/dashboard";
import type { Locale } from "@/lib/i18n/config";
import { EMAIL_CATEGORY_LABEL, type EmailCategory, type EmailPrefs } from "@/lib/notification-categories";

export function EmailPrefsForm({ initial, showDigest, locale = "ko" }: { initial: EmailPrefs; showDigest: boolean; locale?: Locale }) {
  const t = dashboardDict[locale].settings.emailPrefs;
  const cat = (c: EmailCategory) => (locale === "ko" ? EMAIL_CATEGORY_LABEL[c] : t.cats[c] ?? EMAIL_CATEGORY_LABEL[c]);
  const [prefs, setPrefs] = useState<EmailPrefs>(initial);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // 다이제스트: 운영자(아침 업무) · 광고주(주간 성과) · 크리에이터(주간 소식)
  const cats: EmailCategory[] = showDigest ? ["transactional", "reminders", "digest"] : ["transactional", "reminders"];

  function toggle(c: EmailCategory) {
    const next = { ...prefs, [c]: !prefs[c] };
    setPrefs(next);
    setSaved(false);
    setError(null);
    startTransition(async () => {
      const r = await updateEmailPrefs(next, locale);
      if (r.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        setError(r.error);
        setPrefs(prefs);
      }
    });
  }

  return (
    <section id="email" className="scroll-mt-24 rounded-3xl glass-card p-6 lg:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Mail className="size-4" /> {t.title}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t.desc}
          </p>
        </div>
        <div className="text-xs text-muted-foreground">
          {pending ? <Loader2 className="size-4 animate-spin" /> : saved ? t.saved : null}
        </div>
      </div>
      <ul className="mt-5 divide-y divide-border">
        {cats.map((c) => (
          <li key={c} className="flex items-center justify-between gap-4 py-3">
            <div>
              <div className="text-sm font-medium">{cat(c).label}</div>
              <div className="text-xs text-muted-foreground">{cat(c).desc}</div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={prefs[c]}
              aria-label={cat(c).label}
              onClick={() => toggle(c)}
              disabled={pending}
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${prefs[c] ? "bg-accent" : "bg-muted"}`}
            >
              <span
                className={`absolute top-0.5 size-5 rounded-full bg-background shadow transition-transform ${
                  prefs[c] ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </li>
        ))}
      </ul>
      {error && <p className="mt-3 text-xs text-danger">{error}</p>}
      <p className="mt-4 text-[11px] text-muted-foreground">
        {t.footer}
      </p>
    </section>
  );
}
