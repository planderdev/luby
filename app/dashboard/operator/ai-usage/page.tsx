import { redirect } from "next/navigation";
import Link from "next/link";
import { Sparkles, AlertTriangle } from "lucide-react";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "AI 사용량 — 루비AI" };

const FEATURE_LABEL: Record<string, string> = {
  campaign_copy_title: "캠페인 제목 제안",
  campaign_copy_channels: "홍보 유형·채널 제안",
  campaign_copy_recruit: "모집·키워드 제안",
  campaign_copy_offerings: "제공 내역·포인트 제안",
  campaign_draft: "AI에게 전부 맡기기 (전체 초안)",
  creator_match: "AI 크리에이터 매칭",
  applicant_fit: "응모자 AI 적합도",
  content_review: "콘텐츠 AI 사전 검수",
  campaign_precheck: "운영자 검수 사전 점검",
  apply_message: "응모 메시지 AI 초안",
  report_summary: "리포트 AI 요약",
};
const MODEL_LABEL: Record<string, string> = { "claude-sonnet-5": "Sonnet 5", "claude-opus-5": "Opus 5" };

type Stats = {
  days: number;
  total: { calls: number; ok: number; cost_usd: number; input_tokens: number; output_tokens: number; cache_read_tokens: number; avg_ms: number };
  by_feature: { feature: string; model: string; calls: number; errors: number; cost_usd: number; avg_ms: number }[];
  by_day: { day: string; calls: number; cost_usd: number }[];
  top_users: { user_id: string | null; name: string | null; email: string | null; role: string | null; calls: number; cost_usd: number }[];
  recent_errors: { at: string; feature: string; error: string }[];
};

const usd = (n: number) => `$${Number(n).toFixed(n >= 10 ? 2 : 3)}`;
const tok = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n));

export default async function AiUsagePage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const { days: d } = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "operator") redirect("/dashboard");
  const days = [7, 30, 90].includes(Number(d)) ? Number(d) : 30;

  const supabase = await createClient();
  const { data } = await supabase.rpc("ai_usage_stats", { p_days: days });
  const s = data as Stats | null;
  if (!s) return <p className="text-sm text-muted-foreground">사용량 데이터를 불러오지 못했습니다.</p>;

  const maxDay = Math.max(1, ...s.by_day.map((x) => Number(x.cost_usd)));
  const errRate = s.total.calls > 0 ? Math.round(((s.total.calls - s.total.ok) / s.total.calls) * 100) : 0;

  return (
    <div>
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">운영</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <h1 className="display flex items-center gap-3 text-3xl font-semibold lg:text-4xl"><Sparkles className="size-7" /> AI 사용량</h1>
        <div className="flex items-center gap-1 rounded-full border border-border p-0.5 text-xs">
          {[7, 30, 90].map((n) => (
            <Link key={n} href={`/dashboard/operator/ai-usage?days=${n}`} className={`rounded-full px-3 py-1 ${n === days ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}>
              {n}일
            </Link>
          ))}
        </div>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        모든 AI 호출(7개 접점)의 토큰·소요 시간·추정 비용. 비용은 Anthropic 1st-party 요율(Opus 5 $5/$25, Sonnet 5 인트로 $2/$10 → 9월부터 $3/$15, 캐시 읽기 0.1×) 기준 추정치입니다.
      </p>

      {/* 합계 */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          { l: "호출", v: s.total.calls.toLocaleString(), sub: `성공 ${s.total.ok.toLocaleString()}` },
          { l: "추정 비용", v: usd(Number(s.total.cost_usd)), sub: `${days}일 합계` },
          { l: "입력 토큰", v: tok(Number(s.total.input_tokens)), sub: `캐시 읽기 ${tok(Number(s.total.cache_read_tokens))}` },
          { l: "출력 토큰", v: tok(Number(s.total.output_tokens)), sub: "thinking 포함" },
          { l: "평균 응답", v: `${(Number(s.total.avg_ms) / 1000).toFixed(1)}s`, sub: errRate > 0 ? `오류율 ${errRate}%` : "오류 없음" },
        ].map((k) => (
          <div key={k.l} className="rounded-2xl glass-card px-4 py-4">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{k.l}</div>
            <div className="display mt-1 text-2xl font-semibold tabular-nums">{k.v}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* 일별 */}
      <section className="mt-6 rounded-3xl glass-card p-6">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">일별 추정 비용 (KST)</h2>
        {s.by_day.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">기간 내 호출이 없습니다.</p>
        ) : (
          <div className="mt-4 flex h-36 items-end gap-1 overflow-x-auto">
            {s.by_day.map((x) => (
              <div key={x.day} className="group flex min-w-[14px] flex-1 flex-col items-center justify-end" title={`${x.day} · ${x.calls}회 · ${usd(Number(x.cost_usd))}`}>
                <div className="w-full rounded-t-md bg-accent/70 transition-colors group-hover:bg-accent" style={{ height: `${Math.max(3, (Number(x.cost_usd) / maxDay) * 100)}%` }} />
                <div className="mt-1 text-[9px] tabular-nums text-muted-foreground">{x.day.slice(5)}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* 기능별 */}
        <section className="rounded-3xl glass-card p-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">기능별</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="pb-2 pr-3 font-medium">기능</th>
                  <th className="pb-2 pr-3 font-medium">모델</th>
                  <th className="pb-2 pr-3 text-right font-medium">호출</th>
                  <th className="pb-2 pr-3 text-right font-medium">오류</th>
                  <th className="pb-2 pr-3 text-right font-medium">평균</th>
                  <th className="pb-2 text-right font-medium">비용</th>
                </tr>
              </thead>
              <tbody>
                {s.by_feature.map((f) => (
                  <tr key={`${f.feature}-${f.model}`} className="border-b border-border/60 last:border-0">
                    <td className="py-2 pr-3 font-medium">{FEATURE_LABEL[f.feature] ?? f.feature}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{MODEL_LABEL[f.model] ?? f.model}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{f.calls}</td>
                    <td className={`py-2 pr-3 text-right tabular-nums ${f.errors > 0 ? "text-danger" : "text-muted-foreground"}`}>{f.errors}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-muted-foreground">{(f.avg_ms / 1000).toFixed(1)}s</td>
                    <td className="py-2 text-right tabular-nums font-semibold">{usd(Number(f.cost_usd))}</td>
                  </tr>
                ))}
                {s.by_feature.length === 0 && <tr><td colSpan={6} className="py-4 text-center text-muted-foreground">기록 없음</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        {/* 상위 사용자 */}
        <section className="rounded-3xl glass-card p-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">상위 사용자 (비용순)</h2>
          <ul className="mt-3 space-y-2">
            {s.top_users.map((u) => (
              <li key={u.user_id ?? "system"} className="flex items-center justify-between gap-3 rounded-xl bg-muted/50 px-3 py-2 text-sm">
                <div className="min-w-0">
                  {u.user_id ? (
                    <Link href={`/dashboard/operator/users/${u.user_id}`} className="truncate font-medium hover:underline underline-offset-2">{u.name ?? u.email ?? "—"}</Link>
                  ) : (
                    <span className="font-medium">시스템·스크립트</span>
                  )}
                  <div className="truncate text-[11px] text-muted-foreground">{u.role ?? ""}{u.email ? ` · ${u.email}` : ""}</div>
                </div>
                <div className="shrink-0 text-right tabular-nums">
                  <div className="font-semibold">{usd(Number(u.cost_usd))}</div>
                  <div className="text-[11px] text-muted-foreground">{u.calls}회</div>
                </div>
              </li>
            ))}
            {s.top_users.length === 0 && <li className="text-sm text-muted-foreground">기록 없음</li>}
          </ul>
        </section>
      </div>

      {s.recent_errors.length > 0 && (
        <section className="mt-6 rounded-3xl border border-danger/30 bg-danger-soft/20 p-6">
          <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-danger"><AlertTriangle className="size-4" /> 최근 오류</h2>
          <ul className="mt-3 space-y-1.5 text-xs">
            {s.recent_errors.map((e, i) => (
              <li key={i} className="flex flex-wrap gap-x-3 gap-y-0.5">
                <span className="tabular-nums text-muted-foreground">{new Date(e.at).toLocaleString("ko-KR")}</span>
                <span className="font-medium">{FEATURE_LABEL[e.feature] ?? e.feature}</span>
                <span className="text-muted-foreground">{e.error}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
