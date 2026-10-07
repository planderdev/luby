"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Building2, Sparkles } from "lucide-react";
import { completeOnboarding } from "./actions";
import { advertiserKindsFor, type AdvertiserKind } from "@/lib/advertiser-kind";
import { authDict } from "@/lib/i18n/app/auth";
import type { Locale } from "@/lib/i18n/config";
import { regionLabel } from "@/lib/i18n/app/catalog";

type Role = "advertiser" | "influencer";

export function OnboardingForm({
  initialRole,
  defaultName,
  regions,
  next,
  refId,
  locale = "ko",
}: {
  initialRole: Role | null;
  defaultName: string;
  regions: { id: string; code?: string | null; name: string; flag: string }[];
  next: string;
  refId: string | null;
  locale?: Locale;
}) {
  const t = authDict[locale].onboarding;
  const router = useRouter();
  const [role, setRole] = useState<Role | null>(initialRole);
  const [name, setName] = useState(defaultName);
  const [companyName, setCompanyName] = useState("");
  const [businessNumber, setBusinessNumber] = useState("");
  const [kind, setKind] = useState<AdvertiserKind>("brand");
  const [regionId, setRegionId] = useState(regions[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!role) return;
    setError(null);
    startTransition(async () => {
      const r = await completeOnboarding({
        role,
        name,
        companyName,
        businessNumber,
        advertiserKind: kind,
        regionId: role === "influencer" ? regionId || null : null,
        refId,
        locale,
      });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      router.push(next);
      router.refresh();
    });
  }

  const input = "w-full rounded-2xl glass-card px-4 py-3 text-sm outline-none focus:border-foreground";

  return (
    <div className="space-y-6">
      {!role ? (
        <div className="grid gap-3">
          <button type="button" onClick={() => setRole("advertiser")} className="flex items-start gap-3 rounded-2xl border border-border p-4 text-left hover:bg-muted">
            <Building2 className="mt-0.5 size-5 text-accent-ink" />
            <div><div className="text-sm font-semibold">{t.roleAdvertiser}</div><div className="text-xs text-muted-foreground">{t.roleAdvertiserDesc}</div></div>
          </button>
          <button type="button" onClick={() => setRole("influencer")} className="flex items-start gap-3 rounded-2xl border border-border p-4 text-left hover:bg-muted">
            <Sparkles className="mt-0.5 size-5 text-accent-ink" />
            <div><div className="text-sm font-semibold">{t.roleInfluencer}</div><div className="text-xs text-muted-foreground">{t.roleInfluencerDesc}</div></div>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <button type="button" onClick={() => setRole(null)} className="text-xs text-muted-foreground hover:text-foreground">{t.changeRole}</button>
          <div>
            <label className="text-xs font-medium text-muted-foreground">{role === "advertiser" ? t.nameAdvertiser : t.nameInfluencer}</label>
            <input className={`${input} mt-1.5`} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          {role === "advertiser" ? (
            <>
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t.advertiserKind}</label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {advertiserKindsFor(locale).map((k) => {
                    const on = kind === k.value;
                    return (
                      <button key={k.value} type="button" onClick={() => setKind(k.value)} aria-pressed={on} className={`rounded-2xl border px-4 py-3 text-left ${on ? "border-foreground bg-foreground text-background" : "border-border bg-background hover:bg-muted"}`}>
                        <div className="text-sm font-semibold">{k.label}</div>
                        <div className={`mt-0.5 text-xs ${on ? "text-background/70" : "text-muted-foreground"}`}>{k.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">{kind === "agency" ? t.agencyName : t.companyName}</label>
                <input className={`${input} mt-1.5`} value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t.businessNumber}</label>
                <input className={`${input} mt-1.5`} value={businessNumber} onChange={(e) => setBusinessNumber(e.target.value)} placeholder={t.businessNumberPh} required />
              </div>
            </>
          ) : (
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t.region}</label>
              <select className={`${input} mt-1.5`} value={regionId} onChange={(e) => setRegionId(e.target.value)}>
                {regions.map((r) => (
                  <option key={r.id} value={r.id}>{r.flag} {regionLabel(r, locale)}</option>
                ))}
              </select>
              <p className="mt-2 text-xs text-muted-foreground">{t.channelsLater}</p>
            </div>
          )}
          {error && <div className="rounded-2xl border border-accent/30 bg-accent-soft px-4 py-3 text-sm text-accent-ink">{error}</div>}
          <button type="button" onClick={submit} disabled={pending} className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background disabled:opacity-60">
            {pending && <Loader2 className="size-4 animate-spin" />} {t.submit}
          </button>
        </div>
      )}
    </div>
  );
}
