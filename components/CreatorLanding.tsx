import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Coins, Users, Sparkles, Globe, BellRing, IdCard, Gift, CheckCircle2 } from "lucide-react";
import { getStaticSupabase } from "@/lib/supabase/static";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { getSiteUrl, SITE } from "@/lib/seo/site";
import type { Locale } from "@/lib/i18n/config";
import { localePrefix, publicCampaignDict } from "@/lib/i18n/public-campaign";
import { creatorLandingDict } from "@/lib/i18n/creator-landing";
import { RefAwareLink } from "@/components/RefAwareLink";

/** 크리에이터 모집 랜딩 — 실시간 공개 집계(모집 수·남은 자리·포인트)와 상위 포인트 캠페인으로 가입 유도. ISR 10분 */

type Stats = { open_campaigns: number; spots_left: number; points_median: number | null; points_max: number | null; regions: number; channels: string[]; creators_paid_total: number };
type Card = { id: string; title: string; business_name: string; thumbnail_url: string | null; point_amount: number; recruit_count: number; recruit_end: string; always_open: boolean; region: { name: string; flag: string } | null; category: { name: string; emoji: string } | null; channels: string[]; applied: number };

export function buildCreatorLandingMetadata(locale: Locale): Metadata {
  const t = creatorLandingDict[locale];
  const base = getSiteUrl();
  const url = `${base}${localePrefix(locale)}/creators`;
  return {
    title: t.metaTitle,
    description: t.metaDesc,
    alternates: { canonical: url, languages: { "ko-KR": `${base}/creators`, en: `${base}/en/creators`, "zh-CN": `${base}/zh/creators`, "x-default": `${base}/creators` } },
    openGraph: { title: t.metaTitle, description: t.metaDesc, url, siteName: SITE.name, images: [{ url: `${base}/og.png`, width: 1280, height: 720 }] },
  };
}

export async function CreatorLanding({ locale }: { locale: Locale }) {
  const t = creatorLandingDict[locale];
  const tc = publicCampaignDict[locale];
  const pfx = localePrefix(locale);
  const sb = getStaticSupabase();
  const [{ data: statsRaw }, { data: topRaw }, profile] = await Promise.all([
    sb.rpc("public_creator_landing_stats"),
    sb.rpc("list_public_campaigns", { p_limit: 3, p_offset: 0, p_channel: null, p_region: null, p_sort: "points" }),
    getCurrentProfile(),
  ]);
  const s = (statsRaw as Stats | null) ?? null;
  const top = ((topRaw as { items?: Card[] } | null)?.items ?? []).slice(0, 3);
  const fmtP = (n: number | null) => (n === null ? "-" : Math.round(n).toLocaleString());
  const signupHref = profile ? "/dashboard" : `/signup?role=influencer&redirect=${encodeURIComponent("/dashboard/campaigns")}`;
  const icons = [Globe, Sparkles, BellRing, IdCard];
  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(tc.dateFmt, { month: "short", day: "numeric" });

  return (
    <main lang={locale === "zh" ? "zh-CN" : locale} className="min-h-dvh bg-canvas">
      <div className="border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-5">
          <Link href={pfx || "/"} aria-label={t.home} className="inline-flex">
            <Image src="/logo.png" alt="루비AI" width={1298} height={410} className="h-6 w-auto invert dark:invert-0" />
          </Link>
          <div className="flex items-center gap-3">
            <nav aria-label="language" className="flex items-center gap-1 rounded-full border border-border p-0.5 text-[11px]">
              {(["ko", "en", "zh"] as Locale[]).map((l) => (
                <Link key={l} href={`${localePrefix(l)}/creators`} hrefLang={l} className={`rounded-full px-2 py-0.5 ${l === locale ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}>
                  {l === "ko" ? "KR" : l === "en" ? "EN" : "CN"}
                </Link>
              ))}
            </nav>
            <Link href={profile ? "/dashboard" : "/login?redirect=/dashboard/campaigns"} className="text-xs font-medium text-muted-foreground hover:text-foreground">{profile ? tc.dashboard : t.login}</Link>
          </div>
        </div>
      </div>

      {/* Hero */}
      <section className="mx-auto w-full max-w-6xl px-5 pt-12 lg:pt-20">
        <div className="max-w-3xl">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-accent-ink">{t.eyebrow}</div>
          <h1 className="display mt-3 whitespace-pre-line break-keep text-4xl font-semibold leading-[1.1] md:text-5xl" style={{ textWrap: "balance" }}>{t.title}</h1>
          <p className="mt-5 max-w-2xl text-base text-muted-foreground md:text-lg">{t.sub}</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <RefAwareLink href={signupHref} className="inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3.5 text-sm font-medium text-background transition-transform hover:scale-[1.02]">
              {t.ctaPrimary} <ArrowRight className="size-4" />
            </RefAwareLink>
            <Link href={`${pfx}/c`} className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-6 py-3.5 text-sm font-medium hover:bg-muted">{t.ctaSecondary}</Link>
          </div>
          {s && (
            <div className="mt-8 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-accent-soft px-3 py-1.5 font-semibold text-accent-ink">{t.liveOpen(s.open_campaigns)}</span>
              {s.spots_left > 0 && <span className="rounded-full border border-border bg-background px-3 py-1.5">{t.liveSpots(s.spots_left)}</span>}
              {s.points_median !== null && <span className="rounded-full border border-border bg-background px-3 py-1.5">{t.liveMedian(fmtP(s.points_median))}</span>}
              {s.points_max !== null && <span className="rounded-full border border-border bg-background px-3 py-1.5">{t.liveMax(fmtP(s.points_max))}</span>}
              {s.creators_paid_total > 0 && <span className="rounded-full border border-border bg-background px-3 py-1.5">{t.livePaid(fmtP(s.creators_paid_total))}</span>}
            </div>
          )}
        </div>
      </section>

      {/* How */}
      <section className="mx-auto w-full max-w-6xl px-5 pt-16 lg:pt-24">
        <h2 className="display text-2xl font-semibold tracking-tight md:text-3xl">{t.howTitle}</h2>
        <ol className="mt-6 grid gap-4 md:grid-cols-4">
          {t.how.map((h, i) => (
            <li key={h.t} className="rounded-3xl glass-card p-6">
              <div className="flex size-8 items-center justify-center rounded-full bg-accent-strong text-xs font-semibold text-white shadow-pink-sm">{i + 1}</div>
              <h3 className="mt-4 text-base font-semibold">{h.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{h.d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Showcase */}
      {top.length > 0 && (
        <section className="mx-auto w-full max-w-6xl px-5 pt-16 lg:pt-24">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="display text-2xl font-semibold tracking-tight md:text-3xl">{t.showcaseTitle}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t.showcaseSub}</p>
            </div>
            <Link href={`${pfx}/c?sort=points`} aria-label={`${t.showcaseTitle} — ${t.showcaseAll}`} className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">{t.showcaseAll} <ArrowRight className="size-3.5" /></Link>
          </div>
          <ul className="mt-6 grid gap-4 sm:grid-cols-3">
            {top.map((c) => (
              <li key={c.id}>
                <Link href={`${pfx}/c/${c.id}?src=dir`} className="group flex h-full flex-col overflow-hidden rounded-3xl glass-card transition-transform hover:-translate-y-0.5">
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
                    <Image src={c.thumbnail_url ?? `/api/og/campaign/${c.id}`} alt={c.title} fill sizes="(min-width: 640px) 33vw, 100vw" className={`object-cover ${c.thumbnail_url ? "" : "object-left"}`} />
                    {c.applied < c.recruit_count && <span className="absolute right-3 top-3 rounded-full bg-accent-strong px-2.5 py-1 text-[11px] font-semibold text-white shadow-pink-sm">{t.spotsLeft(c.recruit_count - c.applied)}</span>}
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <div className="text-[11px] text-muted-foreground">{c.region?.flag} {c.region?.name} · {c.category?.emoji} {c.category?.name}</div>
                    <h3 className="mt-1.5 line-clamp-2 break-keep text-base font-semibold leading-snug">{c.title}</h3>
                    <div className="mt-0.5 text-xs text-muted-foreground">{c.business_name}</div>
                    <div className="mt-auto flex items-center justify-between pt-4 text-xs">
                      <span className="inline-flex items-center gap-1 font-semibold"><Coins className="size-3.5 text-accent-ink" /> {c.point_amount.toLocaleString()}P</span>
                      <span className="inline-flex items-center gap-1 text-muted-foreground"><Users className="size-3.5" /> {t.spots(c.recruit_count)}{!c.always_open ? ` · ${tc.until(fmtDate(c.recruit_end))}` : ""}</span>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Why */}
      <section className="mx-auto w-full max-w-6xl px-5 pt-16 lg:pt-24">
        <h2 className="display text-2xl font-semibold tracking-tight md:text-3xl">{t.whyTitle}</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {t.why.map((w, i) => {
            const Icon = icons[i] ?? Sparkles;
            return (
              <div key={w.t} className="flex gap-4 rounded-3xl glass-card p-6">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft"><Icon className="size-5 text-accent-ink" /></div>
                <div>
                  <h3 className="text-base font-semibold">{w.t}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{w.d}</p>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4 rounded-3xl border border-accent/30 bg-accent-soft/40 px-6 py-5">
          <Gift className="size-5 shrink-0 text-accent-ink" />
          <div>
            <div className="text-sm font-semibold">{t.referralTitle}</div>
            <div className="text-xs text-muted-foreground">{t.referralDesc}</div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto w-full max-w-6xl px-5 pt-16 lg:pt-24">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="display text-2xl font-semibold tracking-tight md:text-3xl">{t.faqTitle}</h2>
          <Link href={`${locale === "ko" ? "/docs" : `/docs/${locale}`}/creator/1`} className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">{t.guideLink} <ArrowRight className="size-3.5" /></Link>
        </div>
        <dl className="mt-6 grid gap-4 md:grid-cols-3">
          {t.faq.map((f) => (
            <div key={f.q} className="rounded-3xl glass-card p-6">
              <dt className="flex items-start gap-2 text-sm font-semibold"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent-ink" />{f.q}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Final CTA */}
      <section className="mx-auto w-full max-w-6xl px-5 py-16 lg:py-24">
        <div className="rounded-4xl bg-foreground px-8 py-12 text-center text-background">
          <h2 className="display break-keep text-2xl font-semibold md:text-3xl" style={{ textWrap: "balance" }}>{t.finalTitle}</h2>
          <p className="mt-2 text-sm opacity-70">{t.finalSub}</p>
          <RefAwareLink href={signupHref} className="mt-7 inline-flex items-center gap-2 rounded-full bg-background px-6 py-3.5 text-sm font-medium text-foreground hover:opacity-90">
            {t.ctaPrimary} <ArrowRight className="size-4" />
          </RefAwareLink>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        © 2026 {locale === "ko" ? "루비AI" : "Luby AI"} · <Link href={pfx || "/"} className="hover:text-foreground">{tc.footerHome}</Link> · <Link href="/terms" className="hover:text-foreground">{tc.terms}</Link> · <Link href="/privacy" className="hover:text-foreground">{tc.privacy}</Link>
      </footer>
    </main>
  );
}
