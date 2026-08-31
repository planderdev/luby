import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building2, Sparkles, Mail, Phone, CalendarDays, Coins, ExternalLink, Globe, ScrollText } from "lucide-react";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { MemberActions } from "./MemberActions";
import { MemberNotes } from "./MemberNotes";

export const metadata = { title: "회원 상세 — 루비AI" };

const fmtN = (n: number) => (n >= 10000 ? `${(n / 10000).toFixed(1).replace(/\.0$/, "")}만` : n.toLocaleString());
const d = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString("ko-KR") : "—");

export default async function OperatorMemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await getCurrentProfile();
  if (!me) redirect("/login");
  if (me.role !== "operator") redirect("/dashboard");
  const supabase = await createClient();

  const { data: p } = await supabase.from("profiles").select("id, email, name, phone, avatar_url, role, approved, approved_at, created_at, referred_by, onboarding_done, email_prefs, operator_tags, signup_source").eq("id", id).maybeSingle();
  if (!p) notFound();
  const isAdv = p.role === "advertiser";
  const isInf = p.role === "influencer";

  const [advRes, infRes, chRes, catRes, subRes, campRes, appRes, wdRes, refRes, auditRes, notiRes] = await Promise.all([
    isAdv ? supabase.from("advertisers").select("company_name, advertiser_kind, business_number, business_type, representative_name, website, description, contact_phone, contact_email, category_id, business_address, tax_email").eq("profile_id", id).maybeSingle() : Promise.resolve({ data: null }),
    isInf ? supabase.from("influencers").select("bio, region_id, total_points, public_profile, regions(name, flag)").eq("profile_id", id).maybeSingle() : Promise.resolve({ data: null }),
    isInf ? supabase.from("influencer_channels").select("url, handle, followers, channel_types(name)").eq("influencer_id", id) : Promise.resolve({ data: [] }),
    isInf ? supabase.from("influencer_categories").select("categories(name, emoji)").eq("influencer_id", id) : Promise.resolve({ data: [] }),
    isAdv ? supabase.from("subscriptions").select("status, expires_at, plans(name)").eq("advertiser_id", id).maybeSingle() : Promise.resolve({ data: null }),
    isAdv ? supabase.from("campaigns").select("id, title, status, recruit_end, point_amount, created_at").eq("advertiser_id", id).order("created_at", { ascending: false }).limit(20) : Promise.resolve({ data: [] }),
    isInf ? supabase.from("applications").select("id, status, created_at, campaigns(id, title, point_amount)").eq("influencer_id", id).order("created_at", { ascending: false }).limit(20) : Promise.resolve({ data: [] }),
    isInf ? supabase.from("point_withdrawals").select("amount, status, requested_at").eq("influencer_id", id).order("requested_at", { ascending: false }).limit(10) : Promise.resolve({ data: [] }),
    p.referred_by ? supabase.from("profiles").select("id, name, email").eq("id", p.referred_by).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("operator_audit_log").select("id, action, created_at, actor_id, target_label").eq("target_id", id).order("created_at", { ascending: false }).limit(10),
    supabase.from("notifications").select("title, created_at, read_at").eq("user_id", id).order("created_at", { ascending: false }).limit(8),
  ]);
  const { data: noteRows } = await supabase.from("member_notes").select("id, body, pinned, created_at, author_id").eq("profile_id", id).order("pinned", { ascending: false }).order("created_at", { ascending: false }).limit(50);
  type Named = { name: string; flag?: string; emoji?: string } | { name: string; flag?: string; emoji?: string }[] | null;
  const one = (n: Named) => (Array.isArray(n) ? n[0] : n);
  const adv = advRes.data; const inf = infRes.data; const sub = subRes.data;
  const region = inf ? one(inf.regions as Named) : null;
  const plan = sub ? one(sub.plans as Named) : null;
  const refBy = refRes.data;
  const actorIds = [...new Set([...(auditRes.data ?? []).map((a) => a.actor_id), ...(noteRows ?? []).map((n) => n.author_id)].filter(Boolean))] as string[];
  const { data: actors } = actorIds.length ? await supabase.from("profiles").select("id, name").in("id", actorIds) : { data: [] };
  const actorName = new Map((actors ?? []).map((a) => [a.id, a.name]));
  const roleLabel = isAdv ? (adv?.advertiser_kind === "agency" ? "대행사 · 실행사" : "광고주") : isInf ? "크리에이터" : "운영자";

  return (
    <div>
      <Link href="/dashboard/operator/users" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="size-3.5" /> 회원 관리</Link>

      <header className="mt-4 flex flex-wrap items-start gap-5">
        {p.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.avatar_url} alt={p.name} className="size-20 shrink-0 rounded-3xl object-cover" />
        ) : (
          <div className="flex size-20 shrink-0 items-center justify-center rounded-3xl bg-foreground text-2xl font-semibold text-background">{isAdv ? <Building2 className="size-8" /> : p.name.slice(0, 1)}</div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="display text-3xl font-semibold">{isAdv ? adv?.company_name ?? p.name : p.name}</h1>
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs">{roleLabel}</span>
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${p.approved ? "bg-success-soft text-success" : "bg-warning-soft text-warning"}`}>{p.approved ? "승인됨" : "승인 대기"}</span>
            {p.onboarding_done === false && <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">온보딩 미완료</span>}
            {(p.operator_tags ?? []).map((t) => <span key={t} className="rounded-full bg-foreground px-2 py-0.5 text-[11px] text-background">{t}</span>)}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {isAdv && <span>담당자 {p.name}</span>}
            <span className="inline-flex items-center gap-1"><Mail className="size-3.5" /> {p.email}</span>
            {(p.phone || adv?.contact_phone) && <span className="inline-flex items-center gap-1"><Phone className="size-3.5" /> {p.phone ?? adv?.contact_phone}</span>}
            <span className="inline-flex items-center gap-1"><CalendarDays className="size-3.5" /> 가입 {d(p.created_at)}{p.approved_at ? ` · 승인 ${d(p.approved_at)}` : ""}</span>
            {(() => {
              // 가입 경로 (첫 터치) — UTM 이 있으면 그것을, 없으면 유입원 도메인을
              const src = p.signup_source as { utm_source?: string; utm_medium?: string; utm_campaign?: string; referrer?: string } | null;
              if (!src) return null;
              const label = src.utm_source
                ? [src.utm_source, src.utm_medium, src.utm_campaign].filter(Boolean).join(" / ")
                : src.referrer
                  ? (() => { try { return new URL(src.referrer!).hostname; } catch { return src.referrer; } })()
                  : null;
              return label ? <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px]">유입 {label}</span> : null;
            })()}
            {refBy && <span>추천인: <Link href={`/dashboard/operator/users/${refBy.id}`} className="underline underline-offset-2">{refBy.name}</Link></span>}
          </div>
        </div>
        <MemberActions profileId={p.id} approved={p.approved} role={p.role} />
      </header>

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        {/* 역할별 정보 */}
        <section className="rounded-3xl glass-card p-6 lg:col-span-1">
          <h2 className="text-sm font-semibold">{isAdv ? "사업자 정보" : "프로필"}</h2>
          {isAdv && adv && (
            <dl className="mt-3 space-y-2 text-sm">
              <div><dt className="text-xs text-muted-foreground">사업자등록번호</dt><dd className="font-mono">{adv.business_number ?? "미입력"}</dd></div>
              <div><dt className="text-xs text-muted-foreground">대표자</dt><dd>{adv.representative_name ?? "—"}</dd></div>
              <div><dt className="text-xs text-muted-foreground">사업장 주소</dt><dd>{adv.business_address ?? "—"}</dd></div>
              <div><dt className="text-xs text-muted-foreground">세금계산서 이메일</dt><dd>{adv.tax_email ?? p.email}</dd></div>
              <div><dt className="text-xs text-muted-foreground">웹사이트</dt><dd>{adv.website ? <a href={adv.website.startsWith("http") ? adv.website : `https://${adv.website}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline underline-offset-2">{adv.website} <ExternalLink className="size-3" /></a> : "—"}</dd></div>
              <div><dt className="text-xs text-muted-foreground">소개</dt><dd className="text-muted-foreground">{adv.description ?? "—"}</dd></div>
              <div><dt className="text-xs text-muted-foreground">플랜</dt><dd>{plan?.name ?? "FREE"}{sub?.expires_at ? ` · ${d(sub.expires_at)} 만료` : ""}</dd></div>
              <div className="pt-1"><Link href={`/dashboard/advertisers/${p.id}`} className="text-xs underline underline-offset-2">공개 프로필 보기</Link></div>
            </dl>
          )}
          {isInf && inf && (
            <dl className="mt-3 space-y-2 text-sm">
              <div><dt className="text-xs text-muted-foreground">활동 지역</dt><dd>{region ? `${region.flag} ${region.name}` : "—"}</dd></div>
              <div><dt className="text-xs text-muted-foreground">소개</dt><dd className="text-muted-foreground">{inf.bio ?? "—"}</dd></div>
              <div><dt className="text-xs text-muted-foreground">전문 분야</dt><dd>{(catRes.data ?? []).map((c) => { const k = one(c.categories as Named); return k ? `${k.emoji ?? ""} ${k.name}` : ""; }).filter(Boolean).join(", ") || "—"}</dd></div>
              <div><dt className="text-xs text-muted-foreground">채널</dt><dd className="space-y-1">{(chRes.data ?? []).length === 0 ? "—" : (chRes.data ?? []).map((c, i) => { const t = one(c.channel_types as Named); return <div key={i} className="flex items-center justify-between gap-2"><a href={c.url} target="_blank" rel="noopener noreferrer" className="truncate underline underline-offset-2">{t?.name} {c.handle ?? ""}</a><span className="shrink-0 text-xs text-muted-foreground">{fmtN(c.followers ?? 0)}</span></div>; })}</dd></div>
              <div><dt className="text-xs text-muted-foreground">포인트</dt><dd className="inline-flex items-center gap-1"><Coins className="size-3.5" /> {inf.total_points.toLocaleString()}P</dd></div>
              <div className="flex flex-wrap gap-3 pt-1 text-xs"><Link href={`/dashboard/creators/${p.id}`} className="underline underline-offset-2">포트폴리오</Link>{inf.public_profile && <a href={`/p/${p.id}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline underline-offset-2"><Globe className="size-3" /> 공개 프로필</a>}</div>
            </dl>
          )}
        </section>

        {/* 활동 */}
        <section className="rounded-3xl glass-card p-6 lg:col-span-2">
          <h2 className="text-sm font-semibold">{isAdv ? `캠페인 (${(campRes.data ?? []).length})` : `응모 (${(appRes.data ?? []).length})`}</h2>
          {isAdv && (
            <ul className="mt-3 divide-y divide-border text-sm">
              {(campRes.data ?? []).map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-2">
                  <Link href={`/dashboard/campaigns/${c.id}`} className="truncate hover:underline underline-offset-2">{c.title}</Link>
                  <span className="shrink-0 text-xs text-muted-foreground">{c.status} · {c.point_amount.toLocaleString()}P · ~{d(c.recruit_end)}</span>
                </li>
              ))}
              {(campRes.data ?? []).length === 0 && <li className="py-6 text-center text-xs text-muted-foreground">캠페인이 없어요. <Link href={`/dashboard/operator/campaigns/new?advertiser=${p.id}`} className="underline underline-offset-2">대신 만들기</Link></li>}
            </ul>
          )}
          {isInf && (
            <>
              <ul className="mt-3 divide-y divide-border text-sm">
                {(appRes.data ?? []).map((a) => { const c = one(a.campaigns as unknown as Named) as unknown as { id: string; title: string; point_amount: number } | null; return (
                  <li key={a.id} className="flex items-center justify-between gap-3 py-2">
                    {c ? <Link href={`/dashboard/campaigns/${c.id}`} className="truncate hover:underline underline-offset-2">{c.title}</Link> : <span>—</span>}
                    <span className="shrink-0 text-xs text-muted-foreground">{a.status} · {d(a.created_at)}</span>
                  </li>); })}
                {(appRes.data ?? []).length === 0 && <li className="py-6 text-center text-xs text-muted-foreground">응모 이력이 없어요.</li>}
              </ul>
              {(wdRes.data ?? []).length > 0 && (
                <div className="mt-4">
                  <h3 className="text-xs font-semibold text-muted-foreground">출금</h3>
                  <ul className="mt-1 text-xs text-muted-foreground">{(wdRes.data ?? []).map((w, i) => <li key={i}>{d(w.requested_at)} · {w.amount.toLocaleString()}P · {w.status}</li>)}</ul>
                </div>
              )}
            </>
          )}
        </section>

        <MemberNotes
          profileId={p.id}
          tags={p.operator_tags ?? []}
          notes={(noteRows ?? []).map((n) => ({ id: n.id, body: n.body, pinned: n.pinned, created_at: n.created_at, author_name: actorName.get(n.author_id ?? "") ?? null }))}
        />

        {/* 운영 기록 · 알림 */}
        <section className="rounded-3xl glass-card p-6 lg:col-span-3">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold"><ScrollText className="size-4" /> 이 회원에 대한 운영 기록</h2>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                {(auditRes.data ?? []).map((a) => <li key={a.id}>{new Date(a.created_at).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })} · {actorName.get(a.actor_id ?? "") ?? "시스템"} · {a.action}</li>)}
                {(auditRes.data ?? []).length === 0 && <li>기록 없음</li>}
              </ul>
            </div>
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="size-4" /> 최근 받은 알림</h2>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                {(notiRes.data ?? []).map((n, i) => <li key={i} className={n.read_at ? "" : "text-foreground"}>{new Date(n.created_at).toLocaleDateString("ko-KR")} · {n.title}</li>)}
                {(notiRes.data ?? []).length === 0 && <li>알림 없음</li>}
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
