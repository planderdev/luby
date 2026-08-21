import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { getStaticSupabase } from "@/lib/supabase/static";
import { PrintButton } from "./PrintButton";

// 토큰 링크 — 검색엔진 제외, 열 때마다 최신 수치
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "캠페인 성과 리포트",
  robots: { index: false, follow: false },
};

type Report = {
  campaign: {
    id: string;
    title: string;
    business_name: string;
    thumbnail_url: string | null;
    status: "open" | "closed" | "completed";
    recruit_start: string;
    recruit_end: string;
    experience_start: string | null;
    experience_end: string | null;
    recruit_count: number;
    point_amount: number;
    always_open: boolean;
    category: string | null;
    category_emoji: string | null;
    region: string | null;
    region_flag: string | null;
    promotion: string | null;
    company_name: string;
    advertiser_kind: "brand" | "agency";
    completed_at: string | null;
  };
  channels: string[];
  metrics: {
    applied: number;
    selected: number;
    submitted: number;
    approved: number;
    total_reach: number;
    points_paid: number;
    reach_by_channel: { channel: string; followers: number }[];
  };
  contents: {
    id: string;
    content_url: string | null;
    status: string;
    submitted_at: string | null;
    reviewed_at: string | null;
    creator_name: string | null;
    channels: { channel: string; handle: string | null; followers: number | null }[] | null;
  }[];
  ai_summary: { headline: string; summary: string; highlights: string[]; next_steps: string[] } | null;
  ai_summary_at: string | null;
  generated_at: string;
};

const STATUS_LABEL: Record<Report["campaign"]["status"], string> = {
  open: "모집중",
  closed: "모집 마감 · 진행중",
  completed: "완료",
};

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" }) : "—";
const fmtNum = (n: number) =>
  n >= 10000 ? `${(n / 10000).toFixed(1).replace(/\.0$/, "")}만` : n.toLocaleString();
const pct = (num: number, den: number) => (den > 0 ? Math.round((num / den) * 100) : 0);

export default async function ReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f-]{36}$/.test(token)) notFound();

  const supabase = getStaticSupabase();
  const { data } = await supabase.rpc("get_campaign_report", { p_token: token });
  const report = data as Report | null;
  if (!report) notFound();

  const { campaign: c, metrics: m, contents, channels } = report;
  const fillRate = c.recruit_count > 0 ? Math.min(100, Math.round((m.selected / c.recruit_count) * 100)) : 0;
  const funnel = [
    { label: "응모", value: m.applied, rate: null as number | null },
    { label: "선정", value: m.selected, rate: pct(m.selected, m.applied) },
    { label: "콘텐츠 제출", value: m.submitted, rate: pct(m.submitted, m.selected) },
    { label: "승인 · 발행 확정", value: m.approved, rate: pct(m.approved, m.submitted) },
  ];
  const maxFunnel = Math.max(1, ...funnel.map((f) => f.value));
  const approvedContents = contents.filter((x) => x.status === "approved");
  const pendingContents = contents.filter((x) => x.status !== "approved");

  return (
    <main className="min-h-dvh bg-canvas text-foreground print:bg-white">
      <div className="mx-auto w-full max-w-4xl px-5 py-8 md:px-8 md:py-12 print:max-w-none print:px-0 print:py-0">
        {/* 상단 바 */}
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="루비AI" width={1298} height={410} className="h-5 w-auto invert dark:invert-0 print:invert" />
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Campaign Report</span>
          </Link>
          <PrintButton />
        </div>

        {/* 헤더 */}
        <header className="mt-8 rounded-3xl glass-card p-6 md:p-8 print:border print:border-border print:shadow-none">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded-full bg-muted px-2.5 py-1 font-medium text-foreground">{STATUS_LABEL[c.status]}</span>
            {c.region && <span>{c.region_flag} {c.region}</span>}
            {c.category && <span>· {c.category_emoji} {c.category}</span>}
            {c.promotion && <span>· {c.promotion}</span>}
          </div>
          <h1 className="display mt-3 text-2xl font-semibold md:text-3xl" style={{ textWrap: "balance" }}>{c.title}</h1>
          <div className="mt-3 grid gap-x-8 gap-y-1.5 text-sm text-muted-foreground sm:grid-cols-2">
            <div><span className="text-foreground">브랜드 · 매장</span> {c.business_name}</div>
            <div><span className="text-foreground">{c.advertiser_kind === "agency" ? "운영 대행사" : "광고주"}</span> {c.company_name}</div>
            <div><span className="text-foreground">모집 기간</span> {fmtDate(c.recruit_start)} ~ {c.always_open ? "상시" : fmtDate(c.recruit_end)}</div>
            {(c.experience_start || c.experience_end) && (
              <div><span className="text-foreground">체험 기간</span> {c.experience_start ? `${fmtDate(c.experience_start)} ~ ` : ""}{fmtDate(c.experience_end)}{c.experience_start ? "" : "까지"}</div>
            )}
            {channels.length > 0 && <div><span className="text-foreground">채널</span> {channels.join(" · ")}</div>}
            <div><span className="text-foreground">크리에이터 보상</span> {c.point_amount.toLocaleString()}P / 인</div>
          </div>
        </header>

        {/* AI 요약 */}
        {report.ai_summary && (
          <section className="mt-6 rounded-3xl border border-accent/25 bg-accent-soft/30 p-6 md:p-8 print:border print:border-border print:bg-white">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-accent-ink">AI 요약 · 루비AI</div>
              {report.ai_summary_at && <div className="text-[11px] text-muted-foreground">{fmtDate(report.ai_summary_at)} 생성</div>}
            </div>
            <h2 className="display mt-2 text-xl font-semibold md:text-2xl" style={{ textWrap: "balance" }}>{report.ai_summary.headline}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed md:text-[15px]">{report.ai_summary.summary}</p>
            <div className="mt-5 grid gap-5 md:grid-cols-2 print:grid-cols-2">
              {report.ai_summary.highlights.length > 0 && (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">주요 포인트</div>
                  <ul className="mt-2 space-y-1.5 text-sm">
                    {report.ai_summary.highlights.map((h, i) => <li key={i} className="flex gap-2"><span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-accent" />{h}</li>)}
                  </ul>
                </div>
              )}
              {report.ai_summary.next_steps.length > 0 && (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">다음 제안</div>
                  <ul className="mt-2 space-y-1.5 text-sm">
                    {report.ai_summary.next_steps.map((h, i) => <li key={i} className="flex gap-2"><span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-foreground/60" />{h}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </section>
        )}

        {/* 핵심 지표 */}
        <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4 print:grid-cols-4">
          {[
            { l: "모집 진행률", v: `${fillRate}%`, s: `${m.selected}/${c.recruit_count}명 선정` },
            { l: "응모 경쟁률", v: `${c.recruit_count > 0 ? (m.applied / c.recruit_count).toFixed(1) : "0"}:1`, s: `${m.applied}명 응모` },
            { l: "예상 도달", v: fmtNum(m.total_reach), s: "선정 크리에이터 팔로워 합" },
            { l: "발행 콘텐츠", v: `${m.approved}건`, s: `${m.points_paid.toLocaleString()}P 지급` },
          ].map((k) => (
            <div key={k.l} className="rounded-2xl glass-card px-4 py-4 print:border print:border-border print:shadow-none">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{k.l}</div>
              <div className="display mt-1 text-2xl font-semibold tabular-nums">{k.v}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">{k.s}</div>
            </div>
          ))}
        </section>

        {/* 퍼널 + 채널 도달 */}
        <section className="mt-6 grid gap-4 md:grid-cols-[1.4fr_1fr] print:grid-cols-[1.4fr_1fr]">
          <div className="rounded-3xl glass-card p-6 print:border print:border-border print:shadow-none">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">진행 퍼널</h2>
            <ul className="mt-4 space-y-3">
              {funnel.map((f) => (
                <li key={f.label}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="font-medium">{f.label}</span>
                    <span className="tabular-nums text-muted-foreground">
                      <span className="font-semibold text-foreground">{f.value}</span>
                      {f.rate !== null && <span className="ml-1.5 text-xs">({f.rate}%)</span>}
                    </span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-accent/80" style={{ width: `${Math.max(2, (f.value / maxFunnel) * 100)}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl glass-card p-6 print:border print:border-border print:shadow-none">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">채널별 도달</h2>
            {m.reach_by_channel.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">선정된 크리에이터의 채널 정보가 아직 없습니다.</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {m.reach_by_channel.map((r) => (
                  <li key={r.channel} className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2 text-sm">
                    <span>{r.channel}</span>
                    <span className="font-semibold tabular-nums">{fmtNum(r.followers)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* 발행 콘텐츠 */}
        <section className="mt-6 rounded-3xl glass-card p-6 print:border print:border-border print:shadow-none">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">발행 콘텐츠</h2>
            <span className="text-xs text-muted-foreground">승인 {approvedContents.length}건{pendingContents.length > 0 ? ` · 검수 대기 ${pendingContents.length}건` : ""}</span>
          </div>
          {contents.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">아직 제출된 콘텐츠가 없습니다.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="pb-2 pr-3 font-medium">크리에이터</th>
                    <th className="pb-2 pr-3 font-medium">채널 · 팔로워</th>
                    <th className="pb-2 pr-3 font-medium">상태</th>
                    <th className="pb-2 pr-3 font-medium">승인일</th>
                    <th className="pb-2 font-medium">링크</th>
                  </tr>
                </thead>
                <tbody>
                  {[...approvedContents, ...pendingContents].map((x) => {
                    const main = x.channels?.[0];
                    return (
                      <tr key={x.id} className="border-b border-border/60 last:border-0">
                        <td className="py-2.5 pr-3 font-medium">{x.creator_name ?? "크리에이터"}</td>
                        <td className="py-2.5 pr-3 text-muted-foreground">
                          {main ? `${main.channel}${main.handle ? ` @${main.handle.replace(/^@/, "")}` : ""} · ${fmtNum(main.followers ?? 0)}` : "—"}
                        </td>
                        <td className="py-2.5 pr-3">
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${x.status === "approved" ? "bg-success-soft text-success" : "bg-warning-soft text-warning"}`}>
                            {x.status === "approved" ? "승인" : "검수 대기"}
                          </span>
                        </td>
                        <td className="py-2.5 pr-3 tabular-nums text-muted-foreground">{x.status === "approved" ? fmtDate(x.reviewed_at) : "—"}</td>
                        <td className="py-2.5">
                          {x.content_url ? (
                            <a href={x.content_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs underline underline-offset-2">
                              보기 <ExternalLink className="size-3" />
                            </a>
                          ) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <footer className="mt-8 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <span>{fmtDate(report.generated_at)} 기준 · 예상 도달은 선정 크리에이터의 팔로워 합산 근사치입니다.</span>
          <span>© 2026 루비AI · luby.im</span>
        </footer>
      </div>
    </main>
  );
}
