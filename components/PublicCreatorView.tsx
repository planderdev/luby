import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { MapPin, Users, CheckCircle2, ArrowRight, ExternalLink, Sparkles } from "lucide-react";
import { getStaticSupabase } from "@/lib/supabase/static";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { getSiteUrl, SITE } from "@/lib/seo/site";

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

const fmtN = (n: number) => (n >= 10000 ? `${(n / 10000).toFixed(1).replace(/\.0$/, "")}만` : n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}천` : n.toLocaleString());

export async function buildPublicCreatorMetadata(id: string): Promise<Metadata> {
  const c = await fetchPublicCreator(id);
  if (!c) return { title: "프로필을 찾을 수 없어요", robots: { index: false } };
  const total = c.channels.reduce((s, ch) => s + (ch.followers ?? 0), 0);
  const desc = `${c.categories.map((k) => k.name).join("·") || "크리에이터"} · ${c.channels.map((ch) => ch.type).join("/") || "채널"} · 팔로워 ${fmtN(total)} · 체험 완료 ${c.stats.completed}건${c.region ? ` · ${c.region.name}` : ""}`;
  const url = `${getSiteUrl()}/p/${c.id}`;
  return {
    title: `${c.name} — 크리에이터 프로필`,
    description: desc,
    alternates: { canonical: url },
    openGraph: { title: `${c.name} · 루비AI 크리에이터`, description: desc, url, type: "profile", siteName: SITE.name, images: c.avatar_url ? [{ url: c.avatar_url, width: 600, height: 600, alt: c.name }] : [{ url: "/og.png", width: 1280, height: 720 }] },
    twitter: { card: "summary", title: c.name, description: desc, images: c.avatar_url ? [c.avatar_url] : ["/og.png"] },
  };
}

export async function PublicCreatorView({ id }: { id: string }) {
  const c = await fetchPublicCreator(id);
  if (!c) notFound();
  const profile = await getCurrentProfile();
  const total = c.channels.reduce((s, ch) => s + (ch.followers ?? 0), 0);
  const dash = `/dashboard/creators/${c.id}`;
  const cta = profile
    ? profile.role === "advertiser" || profile.role === "operator"
      ? { href: dash, label: "대시보드에서 초대하기" }
      : profile.id === c.id
        ? { href: "/dashboard/settings#public", label: "내 공개 프로필 설정" }
        : null
    : { href: `/signup?role=advertiser&redirect=${encodeURIComponent(dash)}`, label: "광고주로 가입하고 초대하기" };

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
    <main className="min-h-dvh bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="border-b border-border">
        <div className="mx-auto flex h-14 w-full max-w-4xl items-center justify-between px-5">
          <Link href="/" aria-label="루비AI 홈" className="inline-flex">
            <Image src="/logo.png" alt="루비AI" width={1298} height={410} className="h-6 w-auto invert dark:invert-0" />
          </Link>
          {profile ? (
            <Link href="/dashboard" className="text-xs font-medium text-muted-foreground hover:text-foreground">대시보드</Link>
          ) : (
            <Link href="/login" className="text-xs font-medium text-muted-foreground hover:text-foreground">로그인</Link>
          )}
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
              <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-medium text-accent-ink"><Sparkles className="size-3" /> 루비AI 크리에이터</span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {c.region && <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" /> {c.region.flag} {c.region.name}</span>}
              <span className="inline-flex items-center gap-1"><Users className="size-3.5" /> 팔로워 합 {fmtN(total)}</span>
              <span className="inline-flex items-center gap-1"><CheckCircle2 className="size-3.5" /> 체험 완료 {c.stats.completed}건 · 선정 {c.stats.selected}회</span>
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
          <h2 className="text-lg font-semibold">채널</h2>
          {c.channels.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">등록된 채널이 없어요.</p>
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
            <h2 className="text-lg font-semibold">최근 협업</h2>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {c.recent_collabs.map((r, i) => (
                <li key={i} className="rounded-2xl glass-card p-4">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{r.category_emoji} {r.category_name} · {r.business_name}</div>
                  <div className="mt-1 line-clamp-2 text-sm font-medium">{r.title}</div>
                  <div className="mt-1 text-[11px] text-muted-foreground">{new Date(r.completed_at).toLocaleDateString("ko-KR", { year: "numeric", month: "long" })} 완료</div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="mt-12 text-[11px] leading-relaxed text-muted-foreground">이 프로필은 크리에이터 본인이 공개를 선택한 정보만 표시합니다. 루비AI — 글로벌 체험단 마케팅 플랫폼.</p>
      </div>
      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        © 2026 루비AI · <Link href="/" className="hover:text-foreground">홈</Link> · <Link href="/terms" className="hover:text-foreground">이용약관</Link> · <Link href="/privacy" className="hover:text-foreground">개인정보처리방침</Link>
      </footer>
    </main>
  );
}
