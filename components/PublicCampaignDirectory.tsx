import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Coins, Users } from "lucide-react";
import { getStaticSupabase } from "@/lib/supabase/static";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { getSiteUrl, SITE } from "@/lib/seo/site";
import type { Locale } from "@/lib/i18n/config";
import { publicCampaignDict, localePrefix } from "@/lib/i18n/public-campaign";

const PAGE_SIZE = 24;

type Card = {
  id: string;
  title: string;
  business_name: string;
  thumbnail_url: string | null;
  point_amount: number;
  recruit_count: number;
  recruit_end: string;
  always_open: boolean;
  created_at: string;
  region: { name: string; flag: string } | null;
  category: { name: string; emoji: string } | null;
  promotion: string | null;
  channels: string[];
  applied: number;
};
type Directory = {
  total: number;
  items: Card[];
  channels: { slug: string; name: string }[];
  regions: { id: string; name: string; flag: string }[];
};

export type DirectoryParams = { channel?: string; region?: string; page?: string };

async function fetchDirectory(params: DirectoryParams): Promise<Directory & { page: number }> {
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const channel = params.channel && /^[a-z0-9_-]{1,32}$/.test(params.channel) ? params.channel : null;
  const region = params.region && /^[0-9a-f-]{36}$/.test(params.region) ? params.region : null;
  const { data } = await getStaticSupabase().rpc("list_public_campaigns", {
    p_limit: PAGE_SIZE,
    p_offset: (page - 1) * PAGE_SIZE,
    p_channel: channel,
    p_region: region,
  });
  const d = (data as Directory | null) ?? { total: 0, items: [], channels: [], regions: [] };
  return { ...d, page };
}

export function buildDirectoryMetadata(locale: Locale): Metadata {
  const t = publicCampaignDict[locale];
  const base = getSiteUrl();
  const url = `${base}${localePrefix(locale)}/c`;
  return {
    title: t.dirMetaTitle,
    description: t.dirMetaDesc,
    alternates: {
      canonical: url,
      languages: { "ko-KR": `${base}/c`, en: `${base}/en/c`, "zh-CN": `${base}/zh/c`, "x-default": `${base}/c` },
    },
    openGraph: { title: t.dirMetaTitle, description: t.dirMetaDesc, url, type: "website", siteName: SITE.name, images: [{ url: "/og.png", width: 1280, height: 720 }] },
  };
}

/** 공개 캠페인 디렉터리 — 모집중 캠페인 카드 목록 (KR/EN/CN, 로그인 불필요) */
export async function PublicCampaignDirectory({ locale, params }: { locale: Locale; params: DirectoryParams }) {
  const t = publicCampaignDict[locale];
  const pfx = localePrefix(locale);
  const [dir, profile] = await Promise.all([fetchDirectory(params), getCurrentProfile()]);
  const totalPages = Math.max(1, Math.ceil(dir.total / PAGE_SIZE));
  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(t.dateFmt, { month: "short", day: "numeric" });

  const qs = (over: Partial<DirectoryParams>) => {
    const n = new URLSearchParams();
    const merged = { channel: params.channel, region: params.region, ...over };
    if (merged.channel) n.set("channel", merged.channel);
    if (merged.region) n.set("region", merged.region);
    if (merged.page && merged.page !== "1") n.set("page", merged.page);
    const s = n.toString();
    return `${pfx}/c${s ? `?${s}` : ""}`;
  };
  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1.5 text-xs transition-colors ${active ? "border-foreground bg-foreground text-background" : "border-border bg-background hover:bg-muted"}`;

  const signupHref = `/signup?role=influencer&redirect=${encodeURIComponent("/dashboard/campaigns")}`;

  return (
    <main lang={locale === "zh" ? "zh-CN" : locale} className="min-h-dvh bg-canvas">
      {/* Top bar */}
      <div className="border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-5">
          <Link href={pfx || "/"} aria-label={t.home} className="inline-flex">
            <Image src="/logo.png" alt="루비AI" width={1298} height={410} className="h-6 w-auto invert dark:invert-0" />
          </Link>
          <div className="flex items-center gap-3">
            <nav aria-label="language" className="flex items-center gap-1 rounded-full border border-border p-0.5 text-[11px]">
              {(["ko", "en", "zh"] as Locale[]).map((l) => (
                <Link key={l} href={`${localePrefix(l)}/c`} hrefLang={l} className={`rounded-full px-2 py-0.5 ${l === locale ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}>
                  {l === "ko" ? "KR" : l === "en" ? "EN" : "CN"}
                </Link>
              ))}
            </nav>
            {profile ? (
              <Link href="/dashboard" className="text-xs font-medium text-muted-foreground hover:text-foreground">{t.dashboard}</Link>
            ) : (
              <Link href="/login?redirect=/dashboard/campaigns" className="text-xs font-medium text-muted-foreground hover:text-foreground">{t.login}</Link>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl px-5 py-8 lg:py-12">
        <header className="max-w-2xl">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-accent-ink">{t.dirEyebrow} · {t.dirCount(dir.total)}</div>
          <h1 className="display mt-2 break-keep text-3xl font-semibold md:text-4xl" style={{ textWrap: "balance" }}>{t.dirTitle}</h1>
          <p className="mt-3 text-sm text-muted-foreground md:text-base">{t.dirSubtitle}</p>
        </header>

        {/* Filters */}
        <div className="mt-7 flex flex-col gap-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[11px] uppercase tracking-wider text-muted-foreground">{t.dirChannel}</span>
            <Link href={qs({ channel: undefined, page: undefined })} className={chip(!params.channel)}>{t.dirAll}</Link>
            {dir.channels.map((c) => (
              <Link key={c.slug} href={qs({ channel: params.channel === c.slug ? undefined : c.slug, page: undefined })} className={chip(params.channel === c.slug)}>{c.name}</Link>
            ))}
          </div>
          {dir.regions.length > 1 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[11px] uppercase tracking-wider text-muted-foreground">{t.dirRegion}</span>
              <Link href={qs({ region: undefined, page: undefined })} className={chip(!params.region)}>{t.dirAll}</Link>
              {dir.regions.map((r) => (
                <Link key={r.id} href={qs({ region: params.region === r.id ? undefined : r.id, page: undefined })} className={chip(params.region === r.id)}>{r.flag} {r.name}</Link>
              ))}
            </div>
          )}
        </div>

        {/* Cards */}
        {dir.items.length === 0 ? (
          <div className="mt-10 rounded-3xl glass-card p-10 text-center text-sm text-muted-foreground">{t.dirEmpty}</div>
        ) : (
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {dir.items.map((c) => {
              const daysLeft = Math.ceil((new Date(c.recruit_end).getTime() - Date.now()) / 864e5);
              const badge = c.always_open ? t.statusAlways : daysLeft <= 0 ? t.closesToday : t.closesIn(daysLeft);
              const urgent = !c.always_open && daysLeft <= 3;
              return (
                <li key={c.id}>
                  <Link href={`${pfx}/c/${c.id}`} className="group flex h-full flex-col overflow-hidden rounded-3xl glass-card transition-transform hover:-translate-y-0.5">
                    <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={c.thumbnail_url ?? `/api/og/campaign/${c.id}`} alt={c.title} loading="lazy" className={`size-full object-cover transition-transform duration-500 group-hover:scale-[1.03] ${c.thumbnail_url ? "" : "object-left"}`} />
                      <span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-semibold backdrop-blur ${urgent ? "bg-warning-soft text-warning" : "bg-background/90 text-foreground"}`}>{badge}</span>
                    </div>
                    <div className="flex flex-1 flex-col p-4">
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                        {c.region && <span>{c.region.flag} {c.region.name}</span>}
                        {c.category && <span>· {c.category.emoji} {c.category.name}</span>}
                        {c.promotion && <span>· {c.promotion}</span>}
                      </div>
                      <h2 className="mt-1.5 line-clamp-2 break-keep text-base font-semibold leading-snug">{c.title}</h2>
                      <div className="mt-0.5 text-xs text-muted-foreground">{c.business_name}</div>
                      {c.channels.length > 0 && (
                        <div className="mt-2.5 flex flex-wrap gap-1">
                          {c.channels.slice(0, 3).map((ch) => (
                            <span key={ch} className="rounded-full bg-muted px-2 py-0.5 text-[11px]">{ch}</span>
                          ))}
                          {c.channels.length > 3 && <span className="rounded-full bg-muted px-2 py-0.5 text-[11px]">{t.more(c.channels.length - 3)}</span>}
                        </div>
                      )}
                      <div className="mt-auto flex items-center justify-between pt-4 text-xs">
                        <span className="inline-flex items-center gap-1 font-semibold"><Coins className="size-3.5 text-accent-ink" /> {c.point_amount.toLocaleString()}P</span>
                        <span className="inline-flex items-center gap-1 text-muted-foreground"><Users className="size-3.5" /> {t.people(c.recruit_count)} · {t.applied(c.applied)}</span>
                      </div>
                      {!c.always_open && <div className="mt-1 text-[11px] text-muted-foreground">{t.until(fmtDate(c.recruit_end))}</div>}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <nav className="mt-8 flex items-center justify-center gap-3 text-sm" aria-label="pagination">
            {dir.page > 1 ? <Link href={qs({ page: String(dir.page - 1) })} className="rounded-full border border-border px-4 py-2 hover:bg-muted">{t.dirPrev}</Link> : <span className="rounded-full border border-border px-4 py-2 opacity-40">{t.dirPrev}</span>}
            <span className="text-xs text-muted-foreground">{t.dirPage(dir.page, totalPages)}</span>
            {dir.page < totalPages ? <Link href={qs({ page: String(dir.page + 1) })} className="rounded-full border border-border px-4 py-2 hover:bg-muted">{t.dirNext}</Link> : <span className="rounded-full border border-border px-4 py-2 opacity-40">{t.dirNext}</span>}
          </nav>
        )}

        {/* Creator CTA */}
        {!profile && (
          <section className="mt-12 rounded-3xl border border-accent/30 bg-accent-soft/40 p-6 md:flex md:items-center md:justify-between md:p-8">
            <div>
              <div className="text-lg font-semibold">{t.dirCta}</div>
              <p className="mt-1 text-sm text-muted-foreground">{t.dirCtaSub}</p>
            </div>
            <Link href={signupHref} className="btn-neon mt-4 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium md:mt-0">
              {t.ctaSignup} <ArrowRight className="size-4" />
            </Link>
          </section>
        )}
      </div>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        © 2026 {locale === "ko" ? "루비AI" : "Luby AI"} · <Link href={pfx || "/"} className="hover:text-foreground">{t.footerHome}</Link> · <Link href="/terms" className="hover:text-foreground">{t.terms}</Link> · <Link href="/privacy" className="hover:text-foreground">{t.privacy}</Link>
      </footer>
    </main>
  );
}
