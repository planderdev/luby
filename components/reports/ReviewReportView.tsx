import Image from "next/image";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PrintButton } from "@/app/r/[token]/PrintButton";
import { channelLabel, hostOf } from "@/lib/review-channels";

/** get_review_report(p_token) 응답 */
export type ReviewReportData = {
  report: {
    id: string;
    title: string;
    business_name: string;
    period_start: string | null;
    period_end: string | null;
    recruit_count: number | null;
    memo: string | null;
    created_at: string;
    updated_at: string;
  };
  author: { kind: "advertiser" | "operator" | "influencer"; name: string; advertiser_kind: "brand" | "agency" | null };
  campaign: {
    id: string;
    title: string;
    status: string;
    thumbnail_url: string | null;
    region: string | null;
    region_flag: string | null;
    category: string | null;
    category_emoji: string | null;
    is_public: boolean;
  } | null;
  rows: {
    id: string;
    seq: number;
    channel: string;
    creator_name: string | null;
    creator_url: string | null;
    post_url: string;
    posted_at: string | null;
    followers: number | null;
    likes: number | null;
    comments: number | null;
    views: number | null;
    note: string | null;
  }[];
  totals: {
    posts: number;
    creators: number;
    followers: number;
    likes: number;
    comments: number;
    views: number;
    by_channel: { channel: string; posts: number; followers: number; likes: number }[];
  } | null;
  generated_at: string;
};

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" }) : "—";
const fmtShort = (iso: string | null) => (iso ? iso.slice(0, 10).replace(/-/g, ".") : "—");
const fmtNum = (n: number) =>
  n >= 10000 ? `${(n / 10000).toFixed(1).replace(/\.0$/, "")}만` : n.toLocaleString();
const pct = (num: number, den: number) => (den > 0 ? Math.min(100, Math.round((num / den) * 100)) : 0);

/**
 * 결과 보고서(리뷰 링크 엑셀로 만든 보고서) 공개 화면 — /r/<token>.
 * 캠페인 성과 리포트와 같은 레이아웃 언어(글래스 카드·KPI 4칸·표·인쇄)를 따르되, 데이터는 엑셀 행이 전부다.
 */
export function ReviewReportView({ data }: { data: ReviewReportData }) {
  const { report: r, rows, author, campaign } = data;
  const t = data.totals ?? { posts: 0, creators: 0, followers: 0, likes: 0, comments: 0, views: 0, by_channel: [] };
  const hasFollowers = t.followers > 0;
  const reactions = t.likes + t.comments;
  const hasReactions = reactions > 0 || t.views > 0;
  const channels = t.by_channel.map((c) => channelLabel(c.channel));
  const period =
    r.period_start || r.period_end
      ? `${r.period_start ? fmtDate(r.period_start) : ""}${r.period_start && r.period_end ? " ~ " : ""}${r.period_end ? fmtDate(r.period_end) : r.period_start ? "부터" : ""}`
      : null;
  const anyCreatorInfo = rows.some((x) => x.creator_name || x.creator_url);
  const anyFollowers = rows.some((x) => x.followers != null);
  const anyReactions = rows.some((x) => x.likes != null || x.comments != null || x.views != null);
  const anyDate = rows.some((x) => x.posted_at);
  const anyNote = rows.some((x) => x.note);

  const kpis = [
    {
      l: "참여 크리에이터",
      v: `${t.creators}명`,
      s: r.recruit_count ? `모집 ${r.recruit_count}명 중 · ${pct(t.creators, r.recruit_count)}%` : `${channels.length}개 채널`,
    },
    { l: "리뷰 게시", v: `${t.posts}건`, s: t.creators > 0 ? `1인당 ${(t.posts / t.creators).toFixed(1).replace(/\.0$/, "")}건` : "" },
    hasFollowers
      ? { l: "팔로워 도달", v: fmtNum(t.followers), s: "참여 크리에이터 팔로워 합" }
      : { l: "팔로워 도달", v: "—", s: "팔로워 수 미입력" },
    t.views > 0 && reactions === 0
      ? { l: "조회수", v: fmtNum(t.views), s: "게시물 조회 합" }
      : hasReactions
        ? { l: "좋아요 · 댓글", v: fmtNum(reactions), s: `좋아요 ${fmtNum(t.likes)}${t.comments > 0 ? ` · 댓글 ${fmtNum(t.comments)}` : ""}${t.views > 0 ? ` · 조회 ${fmtNum(t.views)}` : ""}` }
        : { l: "좋아요 · 댓글", v: "—", s: "반응 수치 미입력" },
  ];

  return (
    <main className="min-h-dvh bg-canvas text-foreground print:bg-white">
      <div className="mx-auto w-full max-w-4xl px-5 py-8 md:px-8 md:py-12 print:max-w-none print:px-0 print:py-0">
        {/* 상단 바 */}
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="루비AI" width={1298} height={410} className="h-5 w-auto invert dark:invert-0 print:invert" />
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Review Report</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="print:hidden"><ThemeToggle /></span>
            <PrintButton />
          </div>
        </div>

        {/* 헤더 */}
        <header className="mt-8 rounded-3xl glass-card p-6 md:p-8 print:border print:border-border print:shadow-none">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded-full bg-muted px-2.5 py-1 font-medium text-foreground">체험단 결과 보고서</span>
            {channels.map((c) => (
              <span key={c} className="rounded-full border border-border px-2.5 py-1">{c}</span>
            ))}
            {campaign?.region && <span>{campaign.region_flag} {campaign.region}</span>}
            {campaign?.category && <span>· {campaign.category_emoji} {campaign.category}</span>}
          </div>
          <h1 className="display mt-3 break-keep text-2xl font-semibold md:text-3xl" style={{ textWrap: "balance" }}>{r.title}</h1>
          <div className="mt-3 grid gap-x-8 gap-y-1.5 text-sm text-muted-foreground sm:grid-cols-2">
            {r.business_name && <div><span className="text-foreground">브랜드 · 매장</span> {r.business_name}</div>}
            <div>
              <span className="text-foreground">{author.kind === "advertiser" ? (author.advertiser_kind === "agency" ? "운영 대행사" : "광고주") : "작성"}</span> {author.name}
            </div>
            {period && <div><span className="text-foreground">진행 기간</span> {period}</div>}
            <div><span className="text-foreground">참여 · 게시</span> {t.creators}명 · 리뷰 {t.posts}건{r.recruit_count ? ` (모집 ${r.recruit_count}명)` : ""}</div>
            <div><span className="text-foreground">작성일</span> {fmtDate(r.updated_at)}</div>
          </div>
        </header>

        {/* 핵심 지표 */}
        <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4 print:grid-cols-4">
          {kpis.map((k) => (
            <div key={k.l} className="rounded-2xl glass-card px-4 py-4 print:border print:border-border print:shadow-none">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{k.l}</div>
              <div className="display mt-1 text-2xl font-semibold tabular-nums">{k.v}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">{k.s}</div>
            </div>
          ))}
        </section>

        {/* 운영 메모 + 채널별 집계 */}
        {(r.memo || t.by_channel.length > 1) && (
          <section className={`mt-6 grid gap-4 ${r.memo && t.by_channel.length > 1 ? "md:grid-cols-[1.4fr_1fr] print:grid-cols-[1.4fr_1fr]" : ""}`}>
            {r.memo && (
              <div className="rounded-3xl border border-accent/25 bg-accent-soft/30 p-6 print:border print:border-border print:bg-white">
                <h2 className="text-[11px] font-semibold uppercase tracking-wider text-accent-ink">운영 요약</h2>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed md:text-[15px]">{r.memo}</p>
              </div>
            )}
            {t.by_channel.length > 1 && (
              <div className="rounded-3xl glass-card p-6 print:border print:border-border print:shadow-none">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">채널별 게시</h2>
                <ul className="mt-4 space-y-2">
                  {t.by_channel.map((c) => (
                    <li key={c.channel} className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2 text-sm">
                      <span>{channelLabel(c.channel)}</span>
                      <span className="tabular-nums text-muted-foreground">
                        <b className="font-semibold text-foreground">{c.posts}건</b>
                        {c.followers > 0 ? ` · 팔로워 ${fmtNum(c.followers)}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {/* 리뷰 링크 */}
        <section className="mt-6 rounded-3xl glass-card p-6 print:border print:border-border print:shadow-none">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">리뷰 콘텐츠</h2>
            <span className="text-xs text-muted-foreground">{t.posts}건{hasFollowers ? ` · 팔로워 합 ${fmtNum(t.followers)}` : ""}{t.likes > 0 ? ` · 좋아요 ${fmtNum(t.likes)}` : ""}</span>
          </div>
          {rows.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">등록된 리뷰 링크가 없습니다.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="pb-2 pr-3 font-medium">#</th>
                    {anyDate && <th className="pb-2 pr-3 font-medium">게시일</th>}
                    <th className="pb-2 pr-3 font-medium">채널</th>
                    {anyCreatorInfo && <th className="pb-2 pr-3 font-medium">크리에이터</th>}
                    {anyFollowers && <th className="pb-2 pr-3 font-medium">팔로워</th>}
                    <th className="pb-2 pr-3 font-medium">리뷰</th>
                    {anyReactions && <th className="pb-2 pr-3 font-medium">반응</th>}
                    {anyNote && <th className="pb-2 font-medium">비고</th>}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((x) => (
                    <tr key={x.id} className="border-b border-border/60 last:border-0 align-top">
                      <td className="py-2.5 pr-3 tabular-nums text-muted-foreground">{x.seq}</td>
                      {anyDate && <td className="py-2.5 pr-3 tabular-nums whitespace-nowrap">{fmtShort(x.posted_at)}</td>}
                      <td className="py-2.5 pr-3 whitespace-nowrap">{channelLabel(x.channel)}</td>
                      {anyCreatorInfo && (
                        <td className="py-2.5 pr-3">
                          {x.creator_url ? (
                            <a href={x.creator_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium underline underline-offset-2">
                              {x.creator_name || hostOf(x.creator_url)} <ExternalLink className="size-3" />
                            </a>
                          ) : (
                            <span className="font-medium">{x.creator_name ?? "—"}</span>
                          )}
                        </td>
                      )}
                      {anyFollowers && <td className="py-2.5 pr-3 tabular-nums">{x.followers == null ? "—" : fmtNum(x.followers)}</td>}
                      <td className="py-2.5 pr-3">
                        <a href={x.post_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-medium text-success">
                          게시 완료 <ExternalLink className="size-3" />
                        </a>
                        <div className="mt-0.5 max-w-[220px] truncate text-[11px] text-muted-foreground print:max-w-none print:whitespace-normal print:break-all" title={x.post_url}>
                          {x.post_url.replace(/^https?:\/\//, "")}
                        </div>
                      </td>
                      {anyReactions && (
                        <td className="py-2.5 pr-3 tabular-nums text-xs text-muted-foreground whitespace-nowrap">
                          {[
                            x.likes != null ? `♥ ${fmtNum(x.likes)}` : null,
                            x.comments != null ? `💬 ${fmtNum(x.comments)}` : null,
                            x.views != null ? `조회 ${fmtNum(x.views)}` : null,
                          ].filter(Boolean).join(" · ") || "—"}
                        </td>
                      )}
                      {anyNote && <td className="py-2.5 text-xs text-muted-foreground">{x.note ?? ""}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {campaign?.is_public && (
          <section className="mt-6 rounded-3xl glass-card p-5 print:hidden">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">연결된 캠페인</div>
                <div className="mt-1 text-sm font-medium">{campaign.title}</div>
              </div>
              <Link href={`/c/${campaign.id}`} className="inline-flex items-center gap-1 rounded-full border border-border px-4 py-2 text-xs font-medium hover:bg-muted">
                루비AI 캠페인 페이지 <ExternalLink className="size-3" />
              </Link>
            </div>
          </section>
        )}

        <footer className="mt-8 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <span>{fmtDate(data.generated_at)} 기준 · 팔로워·반응 수치는 등록 시점의 입력값입니다.</span>
          <span>© 2026 루비AI · luby.im</span>
        </footer>
      </div>
    </main>
  );
}
