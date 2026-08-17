import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Calendar, Users, Coins, MapPin, Tag, ArrowRight, Building2, Globe, CheckCircle2 } from "lucide-react";
import { getStaticSupabase } from "@/lib/supabase/static";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { getSiteUrl, SITE } from "@/lib/seo/site";
import { advertiserKindLabel } from "@/lib/advertiser-kind";

// 공개 캠페인 페이지 — 로그인 없이 볼 수 있는 공유·SEO용. 데이터는 get_public_campaign() (민감정보 제외).
export const revalidate = 300;

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

async function fetchPublicCampaign(id: string): Promise<PublicCampaign | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const supabase = getStaticSupabase();
  const { data } = await supabase.rpc("get_public_campaign", { p_id: id });
  return (data as PublicCampaign | null) ?? null;
}

const fmt = (iso: string) => new Date(iso).toLocaleDateString("ko-KR", { month: "long", day: "numeric" });

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const c = await fetchPublicCampaign(id);
  if (!c) return { title: "캠페인을 찾을 수 없어요", robots: { index: false } };
  const desc = `${c.business_name} · ${c.category?.name ?? ""} · 모집 ${c.recruit_count}명 · ${c.point_amount > 0 ? `${c.point_amount.toLocaleString()}P` : "제공 내역"} · ${c.channels.join("/")} — ${c.always_open ? "상시 모집" : `${fmt(c.recruit_end)}까지 모집`}`;
  const url = `${getSiteUrl()}/c/${c.id}`;
  return {
    title: `${c.title} — 체험단 모집`,
    description: desc,
    alternates: { canonical: url },
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

export default async function PublicCampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await fetchPublicCampaign(id);
  if (!c) notFound();

  const profile = await getCurrentProfile();
  const isOpen = c.status === "open";
  const daysLeft = Math.ceil((new Date(c.recruit_end).getTime() - Date.now()) / 864e5);
  const dashboardHref = `/dashboard/campaigns/${c.id}`;
  const ctaHref = profile ? dashboardHref : `/signup?role=influencer&redirect=${encodeURIComponent(dashboardHref)}`;
  const ctaLabel = !isOpen ? "모집이 마감된 캠페인이에요" : profile ? (profile.role === "influencer" ? "응모하러 가기" : "대시보드에서 보기") : "가입하고 응모하기";
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
    <main className="min-h-dvh bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {/* Top bar */}
      <div className="border-b border-border">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-5">
          <Link href="/" aria-label="루비AI 홈" className="inline-flex">
            <Image src="/logo.png" alt="루비AI" width={1298} height={410} className="h-6 w-auto invert dark:invert-0" />
          </Link>
          {profile ? (
            <Link href="/dashboard" className="text-xs font-medium text-muted-foreground hover:text-foreground">대시보드</Link>
          ) : (
            <Link href={loginHref} className="text-xs font-medium text-muted-foreground hover:text-foreground">로그인</Link>
          )}
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
                {isOpen ? (c.always_open ? "상시 모집" : daysLeft > 0 ? `모집중 · D-${daysLeft}` : "모집중") : c.status === "closed" ? "모집 마감" : "완료"}
              </span>
            </div>

            <div className="mt-6 text-[11px] uppercase tracking-wider text-muted-foreground">
              {c.region?.flag} {c.region?.name} · {c.category?.emoji} {c.category?.name}{c.promotion_type ? ` · ${c.promotion_type}` : ""}
            </div>
            <h1 className="display mt-2 text-3xl font-semibold lg:text-4xl">{c.title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{c.business_name}</p>
            {c.industry_brief && <p className="mt-5 text-sm leading-relaxed lg:text-base">{c.industry_brief}</p>}

            <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
              <Stat icon={<Users className="size-4" />} label="모집 인원" value={`${c.recruit_count}명`} sub={`${c.applicants}명 응모`} />
              <Stat icon={<Coins className="size-4" />} label="활동 포인트" value={c.point_amount > 0 ? `${c.point_amount.toLocaleString()}P` : "—"} sub="콘텐츠 승인 후 지급" />
              <Stat icon={<Calendar className="size-4" />} label="모집 기간" value={c.always_open ? "상시" : `~${fmt(c.recruit_end)}`} sub={`${fmt(c.recruit_start)} 시작`} />
              <Stat icon={<MapPin className="size-4" />} label="채널" value={c.channels.slice(0, 2).join(" · ") || "—"} sub={c.channels.length > 2 ? `외 ${c.channels.length - 2}` : ""} />
            </div>

            {c.missions.length > 0 && (
              <section className="mt-10">
                <h2 className="text-lg font-semibold">채널별 미션</h2>
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
                <h2 className="text-lg font-semibold">제공 내역</h2>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {c.offerings.map((o, i) => (
                    <li key={i} className="flex items-start gap-3 rounded-2xl glass-card p-4">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent-ink" />
                      <div>
                        <div className="text-sm font-medium">{o.title}</div>
                        {o.description && <div className="mt-0.5 text-xs text-muted-foreground">{o.description}</div>}
                        {o.estimated_value ? <div className="mt-1 text-xs text-muted-foreground">약 {o.estimated_value.toLocaleString()}원 상당</div> : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {c.keywords.length > 0 && (
              <section className="mt-10">
                <h2 className="flex items-center gap-2 text-lg font-semibold"><Tag className="size-4" /> 키워드</h2>
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
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">체험단 응모</div>
              <div className="display mt-2 text-2xl font-semibold">{c.point_amount > 0 ? `${c.point_amount.toLocaleString()}P` : "제공 혜택"}</div>
              <p className="mt-1 text-xs text-muted-foreground">
                {isOpen ? (c.always_open ? "상시 모집 중" : daysLeft > 0 ? `모집 마감까지 ${daysLeft}일` : "오늘 마감") : "모집이 끝났어요"}
              </p>
              {isOpen ? (
                <Link href={ctaHref} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background">
                  {ctaLabel} <ArrowRight className="size-4" />
                </Link>
              ) : (
                <Link href="/signup?role=influencer" className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full border border-border bg-background px-5 py-3 text-sm font-medium hover:bg-muted">
                  다른 캠페인 보러 가입하기 <ArrowRight className="size-4" />
                </Link>
              )}
              {!profile && isOpen && (
                <p className="mt-3 text-center text-[11px] text-muted-foreground">
                  이미 계정이 있나요? <Link href={loginHref} className="underline underline-offset-2">로그인</Link>
                </p>
              )}
              <ul className="mt-5 space-y-1.5 text-xs text-muted-foreground">
                <li>· 가입 무료 · 인스타그램/유튜브/틱톡/블로그/샤오홍슈 등 채널 등록</li>
                <li>· 선정 → 체험 → 콘텐츠 제출 → 검수 후 포인트 지급</li>
                <li>· 포인트는 1만P부터 계좌 정산</li>
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
                      {advertiserKindLabel(c.advertiser.advertiser_kind)} · 루비AI 인증 광고주
                    </div>
                  </div>
                </div>
                {c.advertiser.website && (
                  <a href={c.advertiser.website.startsWith("http") ? c.advertiser.website : `https://${c.advertiser.website}`} target="_blank" rel="noopener noreferrer nofollow" className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                    <Globe className="size-3.5" /> 웹사이트
                  </a>
                )}
              </div>
            )}

            <p className="mt-4 px-1 text-[11px] leading-relaxed text-muted-foreground">
              루비AI는 광고주와 크리에이터를 잇는 글로벌 체험단 플랫폼입니다. 체험단 콘텐츠에는 경제적 대가(협찬) 표기가 필요합니다.
            </p>
          </aside>
        </div>
      </div>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        © 2026 루비AI · <Link href="/" className="hover:text-foreground">홈</Link> · <Link href="/terms" className="hover:text-foreground">이용약관</Link> · <Link href="/privacy" className="hover:text-foreground">개인정보처리방침</Link>
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
