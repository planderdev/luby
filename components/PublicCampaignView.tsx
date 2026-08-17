import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Calendar, Users, Coins, MapPin, Tag, ArrowRight, Building2, Globe, CheckCircle2 } from "lucide-react";
import { getStaticSupabase } from "@/lib/supabase/static";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { getSiteUrl, SITE } from "@/lib/seo/site";
import { publicCampaignDict, localePrefix } from "@/lib/i18n/public-campaign";
import type { Locale } from "@/lib/i18n/config";

// 공개 캠페인 페이지 — 로그인 없이 볼 수 있는 공유·SEO용. 데이터는 get_public_campaign() (민감정보 제외).

type PublicCampaign = {
  id: string;
  title: string;
  business_name: string;
  thumbnail_url: string | null;
  status: "open" | "closed" | "completed";
  recruit_start: string;
  recruit_end: string;
  experience_start: string | null;
  experience_end: string | null;
  always_open: boolean;
  same_day_reservation: boolean;
  recruit_count: number;
  point_amount: number;
  industry_brief: string | null;
  region: { name: string; flag: string } | null;
  category: { name: string; emoji: string } | null;
  promotion_type: string | null;
  channels: string[];
  missions: { channel: string; description: string }[];
  keywords: string[];
  offerings: { title: string; description: string | null; estimated_value: number | null }[];
  applicants: number;
  advertiser: { id: string; company_name: string; avatar_url: string | null; advertiser_kind: string | null; website: string | null } | null;
};

export async function fetchPublicCampaign(id: string): Promise<PublicCampaign | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const supabase = getStaticSupabase();
  const { data } = await supabase.rpc("get_public_campaign", { p_id: id });
  return (data as PublicCampaign | null) ?? null;
}

const fmtFor = (locale: Locale) => (iso: string) => new Date(iso).toLocaleDateString(locale === "ko" ? "ko-KR" : locale === "zh" ? "zh-CN" : "en-US", { month: "long", day: "numeric" });

export async function buildPublicCampaignMetadata(id: string, locale: Locale): Promise<Metadata> {
  const c = await fetchPublicCampaign(id);
  const t = publicCampaignDict[locale];
  if (!c) return { title: locale === "ko" ? "캠페인을 찾을 수 없어요" : locale === "zh" ? "找不到该活动" : "Campaign not found", robots: { index: false } };
  const fmt = fmtFor(locale);
  const desc = t.metaDesc(c.business_name, c.category?.name ?? "", c.recruit_count, c.point_amount > 0 ? `${c.point_amount.toLocaleString()}P` : t.metaReward, c.channels.join("/"), c.always_open ? t.metaAlways : t.metaUntil(fmt(c.recruit_end)));
  const base = getSiteUrl();
  const url = `${base}${localePrefix(locale)}/c/${c.id}`;
  return {
    title: `${c.title} — ${t.metaSuffix}`,
    description: desc,
    alternates: {
      canonical: url,
      languages: { "ko-KR": `${base}/c/${c.id}`, en: `${base}/en/c/${c.id}`, "zh-CN": `${base}/zh/c/${c.id}`, "x-default": `${base}/c/${c.id}` },
    },
    robots: c.status === "open" ? { index: true, follow: true } : { index: false, follow: true },
    openGraph: {
      title: c.title,
      description: desc,
      url,
      type: "article",
      siteName: SITE.name,
      images: c.thumbnail_url ? [{ url: c.thumbnail_url, width: 1200, height: 630, alt: c.title }] : [{ url: "/og.png", width: 1280, height: 720 }],
    },
    twitter: { card: "summary_large_image", title: c.title, description: desc, images: c.thumbnail_url ? [c.thumbnail_url] : ["/og.png"] },
  };
}

export async function PublicCampaignView({ id, locale }: { id: string; locale: Locale }) {
  const c = await fetchPublicCampaign(id);
  if (!c) notFound();
  const t = publicCampaignDict[locale];
  const fmt = fmtFor(locale);
  const pfx = localePrefix(locale);

  const profile = await getCurrentProfile();
  const isOpen = c.status === "open";
  const daysLeft = Math.ceil((new Date(c.recruit_end).getTime() - Date.now()) / 864e5);
  const dashboardHref = `/dashboard/campaigns/${c.id}`;
  const ctaHref = profile ? dashboardHref : `/signup?role=influencer&redirect=${encodeURIComponent(dashboardHref)}`;
  const ctaLabel = profile ? (profile.role === "influencer" ? t.ctaApply : t.ctaDashboard) : t.ctaSignup;
  const loginHref = `/login?redirect=${encodeURIComponent(dashboardHref)}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: c.title,
    description: c.industry_brief ?? `${c.business_name} 체험단 모집`,
    startDate: c.recruit_start,
    endDate: c.recruit_end,
    eventStatus: isOpen ? "https://schema.org/EventScheduled" : "https://schema.org/EventCancelled",
    eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
    organizer: { "@type": "Organization", name: c.advertiser?.company_name ?? c.business_name },
    location: { "@type": "VirtualLocation", url: `${getSiteUrl()}/c/${c.id}` },
    image: c.thumbnail_url ?? `${getSiteUrl()}/og.png`,
    offers: { "@type": "Offer", price: 0, priceCurrency: "KRW", availability: isOpen ? "https://schema.org/InStock" : "https://schema.org/SoldOut", url: `${getSiteUrl()}/c/${c.id}` },
  };

  return (
    <main lang={locale === "zh" ? "zh-CN" : locale} className="min-h-dvh bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {/* Top bar */}
      <div className="border-b border-border">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-5">
          <Link href="/" aria-label={t.home} className="inline-flex">
            <Image src="/logo.png" alt="루비AI" width={1298} height={410} className="h-6 w-auto invert dark:invert-0" />
          </Link>
          <div className="flex items-center gap-3">
            <nav aria-label="language" className="flex items-center gap-1 rounded-full border border-border p-0.5 text-[11px]">
              {(["ko", "en", "zh"] as Locale[]).map((l) => (
                <Link
                  key={l}
                  href={`${localePrefix(l)}/c/${c.id}`}
                  hrefLang={l}
                  className={`rounded-full px-2 py-0.5 ${l === locale ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {l === "ko" ? "KO" : l === "en" ? "EN" : "中文"}
                </Link>
              ))}
            </nav>
          {profile ? (
            <Link href="/dashboard" className="text-xs font-medium text-muted-foreground hover:text-foreground">{t.dashboard}</Link>
          ) : (
            <Link href={loginHref} className="text-xs font-medium text-muted-foreground hover:text-foreground">{t.login}</Link>
          )}
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-5xl px-5 py-8 lg:py-12">
        <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          {/* Left: content */}
          <article>
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-3xl bg-muted">
              {c.thumbnail_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.thumbnail_url} alt={c.title} className="size-full object-cover" />
              ) : (
                <div className="flex size-full items-center justify-center text-6xl opacity-40">{c.category?.emoji ?? "🎯"}</div>
              )}
              <span className={`absolute left-4 top-4 rounded-full px-3 py-1 text-xs font-medium ${isOpen ? "bg-success-soft text-success" : "bg-muted text-muted-foreground"}`}>
                {isOpen ? (c.always_open ? t.statusAlways : daysLeft > 0 ? t.dLeft(daysLeft) : t.statusOpen) : c.status === "closed" ? t.statusClosed : t.statusCompleted}
              </span>
            </div>

            <div className="mt-6 text-[11px] uppercase tracking-wider text-muted-foreground">
              {c.region?.flag} {c.region?.name} · {c.category?.emoji} {c.category?.name}{c.promotion_type ? ` · ${c.promotion_type}` : ""}
            </div>
            <h1 className="display mt-2 text-3xl font-semibold lg:text-4xl">{c.title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{c.business_name}</p>
            {c.industry_brief && <p className="mt-5 text-sm leading-relaxed lg:text-base">{c.industry_brief}</p>}

            <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
              <Stat icon={<Users className="size-4" />} label={t.recruit} value={t.people(c.recruit_count)} sub={t.applied(c.applicants)} />
              <Stat icon={<Coins className="size-4" />} label={t.points} value={c.point_amount > 0 ? `${c.point_amount.toLocaleString()}P` : "—"} sub={t.pointsSub} />
              <Stat icon={<Calendar className="size-4" />} label={t.period} value={c.always_open ? t.always : t.until(fmt(c.recruit_end))} sub={t.startsAt(fmt(c.recruit_start))} />
              <Stat icon={<MapPin className="size-4" />} label={t.channels} value={c.channels.slice(0, 2).join(" · ") || "—"} sub={c.channels.length > 2 ? t.more(c.channels.length - 2) : ""} />
            </div>

            {c.missions.length > 0 && (
              <section className="mt-10">
                <h2 className="text-lg font-semibold">{t.missions}</h2>
                <ul className="mt-3 space-y-2">
                  {c.missions.map((m, i) => (
                    <li key={i} className="rounded-2xl glass-card p-4">
                      <div className="text-xs font-semibold text-accent-ink">{m.channel}</div>
                      <p className="mt-1 text-sm leading-relaxed">{m.description}</p>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {c.offerings.length > 0 && (
              <section className="mt-10">
                <h2 className="text-lg font-semibold">{t.offerings}</h2>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {c.offerings.map((o, i) => (
                    <li key={i} className="flex items-start gap-3 rounded-2xl glass-card p-4">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent-ink" />
                      <div>
                        <div className="text-sm font-medium">{o.title}</div>
                        {o.description && <div className="mt-0.5 text-xs text-muted-foreground">{o.description}</div>}
                        {o.estimated_value ? <div className="mt-1 text-xs text-muted-foreground">{t.worth(o.estimated_value.toLocaleString())}</div> : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {c.keywords.length > 0 && (
              <section className="mt-10">
                <h2 className="flex items-center gap-2 text-lg font-semibold"><Tag className="size-4" /> {t.keywords}</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {c.keywords.map((k) => (
                    <span key={k} className="rounded-full bg-muted px-3 py-1 text-xs">#{k}</span>
                  ))}
                </div>
              </section>
            )}
          </article>

          {/* Right: CTA + advertiser */}
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-3xl border border-accent/30 bg-accent-soft/40 p-6">
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{t.applyBox}</div>
              <div className="display mt-2 text-2xl font-semibold">{c.point_amount > 0 ? `${c.point_amount.toLocaleString()}P` : t.benefit}</div>
              <p className="mt-1 text-xs text-muted-foreground">
                {isOpen ? (c.always_open ? t.statusAlways : daysLeft > 0 ? t.daysToClose(daysLeft) : t.closesToday) : t.ended}
              </p>
              {isOpen ? (
                <Link href={ctaHref} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background">
                  {ctaLabel} <ArrowRight className="size-4" />
                </Link>
              ) : (
                <Link href="/signup?role=influencer" className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full border border-border bg-background px-5 py-3 text-sm font-medium hover:bg-muted">
                  {t.ctaOthers} <ArrowRight className="size-4" />
                </Link>
              )}
              {!profile && isOpen && (
                <p className="mt-3 text-center text-[11px] text-muted-foreground">
                  {t.haveAccount} <Link href={loginHref} className="underline underline-offset-2">{t.login}</Link>
                </p>
              )}
              <ul className="mt-5 space-y-1.5 text-xs text-muted-foreground">
                {t.bullets.map((b) => (
                  <li key={b}>· {b}</li>
                ))}
              </ul>
            </div>

            {c.advertiser && (
              <div className="mt-4 rounded-3xl glass-card p-5">
                <div className="flex items-center gap-3">
                  {c.advertiser.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.advertiser.avatar_url} alt={c.advertiser.company_name} className="size-11 rounded-2xl object-cover" />
                  ) : (
                    <div className="flex size-11 items-center justify-center rounded-2xl bg-foreground text-background"><Building2 className="size-5" /></div>
                  )}
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{c.advertiser.company_name}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {c.advertiser.advertiser_kind === "agency" ? t.kindAgency : t.kindBrand} · {t.verified}
                    </div>
                  </div>
                </div>
                {c.advertiser.website && (
                  <a href={c.advertiser.website.startsWith("http") ? c.advertiser.website : `https://${c.advertiser.website}`} target="_blank" rel="noopener noreferrer nofollow" className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                    <Globe className="size-3.5" /> {t.website}
                  </a>
                )}
              </div>
            )}

            <p className="mt-4 px-1 text-[11px] leading-relaxed text-muted-foreground">
              {t.disclaimer}
            </p>
          </aside>
        </div>
      </div>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        © 2026 {locale === "ko" ? "루비AI" : "Luby AI"} · <Link href={pfx || "/"} className="hover:text-foreground">{t.footerHome}</Link> · <Link href="/terms" className="hover:text-foreground">{t.terms}</Link> · <Link href="/privacy" className="hover:text-foreground">{t.privacy}</Link>
      </footer>
    </main>
  );
}

function Stat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl glass-card p-4">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">{icon} {label}</div>
      <div className="mt-2 text-base font-semibold">{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}
