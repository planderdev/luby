import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { MapPin, Users, CheckCircle2, ArrowRight, ExternalLink, Sparkles } from "lucide-react";
import { getStaticSupabase } from "@/lib/supabase/static";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { getSiteUrl, SITE } from "@/lib/seo/site";
import { publicCreatorDict } from "@/lib/i18n/public-creator";
import { localePrefix } from "@/lib/i18n/public-campaign";
import type { Locale } from "@/lib/i18n/config";

/** 크리에이터 공개 프로필 (옵트인). 데이터: get_public_creator() — 본인이 켠 경우에만 값 반환 */
export type PublicCreator = {
  id: string;
  name: string;
  avatar_url: string | null;
  bio: string | null;
  region: { name: string; flag: string } | null;
  categories: { name: string; emoji: string }[];
  channels: { type: string; slug: string; handle: string | null; url: string; followers: number }[];
  stats: { selected: number; completed: number };
  recent_collabs: { title: string; business_name: string; category_emoji: string | null; category_name: string | null; completed_at: string }[];
  joined_at: string;
};

export async function fetchPublicCreator(id: string): Promise<PublicCreator | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const { data } = await getStaticSupabase().rpc("get_public_creator", { p_id: id });
  return (data as PublicCreator | null) ?? null;
}

const fmtNFor = (locale: Locale) => (n: number) =>
  locale === "ko"
    ? n >= 10000 ? `${(n / 10000).toFixed(1).replace(/\.0$/, "")}만` : n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}천` : n.toLocaleString()
    : locale === "zh"
      ? n >= 10000 ? `${(n / 10000).toFixed(1).replace(/\.0$/, "")}万` : n.toLocaleString()
      : n >= 1000000 ? `${(n / 1000000).toFixed(1).replace(/\.0$/, "")}M` : n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K` : n.toLocaleString();

export async function buildPublicCreatorMetadata(id: string, locale: Locale = "ko"): Promise<Metadata> {
  const c = await fetchPublicCreator(id);
  const t = publicCreatorDict[locale];
  if (!c) return { title: locale === "ko" ? "프로필을 찾을 수 없어요" : locale === "zh" ? "找不到该资料" : "Profile not found", robots: { index: false } };
  const fmtN = fmtNFor(locale);
  const total = c.channels.reduce((s, ch) => s + (ch.followers ?? 0), 0);
  const desc = t.metaDesc(c.categories.map((k) => k.name).join("·"), c.channels.map((ch) => ch.type).join("/"), fmtN(total), c.stats.completed, c.region ? ` · ${c.region.name}` : "");
  const base = getSiteUrl();
  const url = `${base}${localePrefix(locale)}/p/${c.id}`;
  return {
    title: t.metaTitle(c.name),
    description: desc,
    alternates: { canonical: url, languages: { "ko-KR": `${base}/p/${c.id}`, en: `${base}/en/p/${c.id}`, "zh-CN": `${base}/zh/p/${c.id}`, "x-default": `${base}/p/${c.id}` } },
    openGraph: { title: t.ogTitle(c.name), description: desc, url, type: "profile", siteName: SITE.name, images: c.avatar_url ? [{ url: c.avatar_url, width: 600, height: 600, alt: c.name }] : [{ url: "/og.png", width: 1280, height: 720 }] },
    twitter: { card: "summary", title: c.name, description: desc, images: c.avatar_url ? [c.avatar_url] : ["/og.png"] },
  };
}

export async function PublicCreatorView({ id, locale = "ko" }: { id: string; locale?: Locale }) {
  const c = await fetchPublicCreator(id);
  if (!c) notFound();
  const t = publicCreatorDict[locale];
  const fmtN = fmtNFor(locale);
  const pfx = localePrefix(locale);
  const profile = await getCurrentProfile();
  const total = c.channels.reduce((s, ch) => s + (ch.followers ?? 0), 0);
  const dash = `/dashboard/creators/${c.id}`;
  const cta = profile
    ? profile.role === "advertiser" || profile.role === "operator"
      ? { href: dash, label: t.ctaInvite }
      : profile.id === c.id
        ? { href: "/dashboard/settings#public", label: t.ctaMine }
        : null
    : { href: `/signup?role=advertiser&redirect=${encodeURIComponent(dash)}`, label: t.ctaSignup };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: c.name,
    description: c.bio ?? undefined,
    image: c.avatar_url ?? undefined,
    url: `${getSiteUrl()}/p/${c.id}`,
    sameAs: c.channels.map((ch) => ch.url),
    jobTitle: "Creator",
    address: c.region ? { "@type": "PostalAddress", addressCountry: c.region.name } : undefined,
  };

  return (
    <main lang={locale === "zh" ? "zh-CN" : locale} className="min-h-dvh bg-canvas">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="border-b border-border">
        <div className="mx-auto flex h-14 w-full max-w-4xl items-center justify-between px-5">
          <Link href={pfx || "/"} aria-label={t.home} className="inline-flex">
            <Image src="/logo.png" alt="루비AI" width={1298} height={410} className="h-6 w-auto invert dark:invert-0" />
          </Link>
          <div className="flex items-center gap-3">
            <nav aria-label="language" className="flex items-center gap-1 rounded-full border border-border p-0.5 text-[11px]">
              {(["ko", "en", "zh"] as Locale[]).map((l) => (
                <Link key={l} href={`${localePrefix(l)}/p/${c.id}`} hrefLang={l} className={`rounded-full px-2 py-0.5 ${l === locale ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}>
                  {l === "ko" ? "KR" : l === "en" ? "EN" : "CN"}
                </Link>
              ))}
            </nav>
            {profile ? (
              <Link href="/dashboard" className="text-xs font-medium text-muted-foreground hover:text-foreground">{t.dashboard}</Link>
            ) : (
              <Link href="/login" className="text-xs font-medium text-muted-foreground hover:text-foreground">{t.login}</Link>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-4xl px-5 py-8 lg:py-12">
        <header className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
          {c.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={c.avatar_url} alt={c.name} className="size-24 shrink-0 rounded-3xl object-cover" />
          ) : (
            <div className="flex size-24 shrink-0 items-center justify-center rounded-3xl bg-foreground text-3xl font-semibold text-background">{c.name.slice(0, 1)}</div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="display text-3xl font-semibold">{c.name}</h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-medium text-accent-ink"><Sparkles className="size-3" /> {t.badge}</span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {c.region && <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" /> {c.region.flag} {c.region.name}</span>}
              <span className="inline-flex items-center gap-1"><Users className="size-3.5" /> {t.followersTotal(fmtN(total))}</span>
              <span className="inline-flex items-center gap-1"><CheckCircle2 className="size-3.5" /> {t.stats(c.stats.completed, c.stats.selected)}</span>
            </div>
            {c.categories.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {c.categories.map((k) => (
                  <span key={k.name} className="rounded-full bg-muted px-2.5 py-1 text-xs">{k.emoji} {k.name}</span>
                ))}
              </div>
            )}
          </div>
          {cta && (
            <Link href={cta.href} className="inline-flex shrink-0 items-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background">
              {cta.label} <ArrowRight className="size-4" />
            </Link>
          )}
        </header>

        {c.bio && <p className="mt-8 max-w-2xl text-sm leading-relaxed lg:text-base">{c.bio}</p>}

        <section className="mt-10">
          <h2 className="text-lg font-semibold">{t.channels}</h2>
          {c.channels.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">{t.noChannels}</p>
          ) : (
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {c.channels.map((ch) => (
                <li key={ch.url} className="flex items-center justify-between gap-3 rounded-2xl glass-card px-4 py-3">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-accent-ink">{ch.type}</div>
                    <div className="truncate text-sm">{ch.handle ?? ch.url}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
                    {ch.followers > 0 && <span>{fmtN(ch.followers)}</span>}
                    <a href={ch.url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 hover:text-foreground"><ExternalLink className="size-3.5" /></a>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {c.recent_collabs.length > 0 && (
          <section className="mt-10">
            <h2 className="text-lg font-semibold">{t.recent}</h2>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {c.recent_collabs.map((r, i) => (
                <li key={i} className="rounded-2xl glass-card p-4">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{r.category_emoji} {r.category_name} · {r.business_name}</div>
                  <div className="mt-1 line-clamp-2 text-sm font-medium">{r.title}</div>
                  <div className="mt-1 text-[11px] text-muted-foreground">{t.completedAt(new Date(r.completed_at).toLocaleDateString(t.dateLocale, { year: "numeric", month: "long" }))}</div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="mt-12 text-[11px] leading-relaxed text-muted-foreground">{t.disclaimer}</p>
      </div>
      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        © 2026 {t.brand} · <Link href={pfx || "/"} className="hover:text-foreground">{t.footerHome}</Link> · <Link href="/terms" className="hover:text-foreground">{t.terms}</Link> · <Link href="/privacy" className="hover:text-foreground">{t.privacy}</Link>
      </footer>
    </main>
  );
}
