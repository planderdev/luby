import { redirect } from "next/navigation";
import Link from "next/link";
import { Bug } from "lucide-react";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "오류 로그 — 루비AI" };

type Stats = {
  days: number;
  total: number;
  today: number;
  affected_users: number;
  top: { fingerprint: string; message: string; path: string | null; source: string; count: number; last_at: string }[];
  recent: { id: string; at: string; source: string; message: string; path: string | null; method: string | null; route_type: string | null; digest: string | null; stack: string | null }[];
  by_day: { day: string; count: number }[];
};

const fmt = (iso: string) => new Date(iso).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });

export default async function ErrorsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const { days: d } = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "operator") redirect("/dashboard");
  const days = [1, 7, 30].includes(Number(d)) ? Number(d) : 7;
  const supabase = await createClient();
  const { data } = await supabase.rpc("server_error_stats", { p_days: days });
  const s = data as Stats | null;
  if (!s) return <p className="text-sm text-muted-foreground">오류 로그를 불러오지 못했습니다.</p>;
  const maxDay = Math.max(1, ...s.by_day.map((x) => x.count));

  return (
    <div>
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">운영</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <h1 className="display flex items-center gap-3 text-3xl font-semibold lg:text-4xl"><Bug className="size-7" /> 오류 로그</h1>
        <div className="flex items-center gap-1 rounded-full border border-border p-0.5 text-xs">
          {[1, 7, 30].map((n) => (
            <Link key={n} href={`/dashboard/operator/errors?days=${n}`} className={`rounded-full px-3 py-1 ${n === days ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}>{n}일</Link>
          ))}
        </div>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">서버 렌더·API·서버 액션에서 잡히지 않은 예외와 대시보드 에러 화면이 뜬 클라이언트 오류. 같은 경로·메시지는 하나로 묶입니다.</p>

      <div className="mt-6 grid grid-cols-3 gap-3">
        {[
          { l: `${days}일 오류`, v: s.total, s: "" },
          { l: "오늘", v: s.today, s: "KST 기준" },
          { l: "영향 사용자", v: s.affected_users, s: "로그인 사용자 기준" },
        ].map((k) => (
          <div key={k.l} className="rounded-2xl glass-card px-4 py-4">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{k.l}</div>
            <div className={`display mt-1 text-2xl font-semibold tabular-nums ${k.v > 0 && k.l === "오늘" ? "text-danger" : ""}`}>{k.v.toLocaleString()}</div>
            {k.s && <div className="mt-0.5 text-xs text-muted-foreground">{k.s}</div>}
          </div>
        ))}
      </div>

      {s.by_day.length > 0 && (
        <section className="mt-6 rounded-3xl glass-card p-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">일별</h2>
          <div className="mt-4 flex h-24 items-end gap-1">
            {s.by_day.map((x) => (
              <div key={x.day} className="flex min-w-[14px] flex-1 flex-col items-center justify-end" title={`${x.day} · ${x.count}건`}>
                <div className="w-full rounded-t-md bg-danger/70" style={{ height: `${Math.max(4, (x.count / maxDay) * 100)}%` }} />
                <div className="mt-1 text-[9px] tabular-nums text-muted-foreground">{x.day.slice(5)}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-6 rounded-3xl glass-card p-6">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">자주 발생 (묶음)</h2>
        {s.top.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">기간 내 오류가 없습니다. 🎉</p>
        ) : (
          <ul className="mt-3 divide-y divide-border/60">
            {s.top.map((t) => (
              <li key={t.fingerprint} className="flex items-start justify-between gap-4 py-3 text-sm">
                <div className="min-w-0">
                  <div className="truncate font-medium">{t.message}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{t.source} · {t.path ?? "—"} · 마지막 {fmt(t.last_at)}</div>
                </div>
                <span className="shrink-0 rounded-full bg-danger-soft px-2.5 py-0.5 text-xs font-semibold tabular-nums text-danger">{t.count}회</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {s.recent.length > 0 && (
        <section className="mt-6 rounded-3xl glass-card p-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">최근 50건</h2>
          <ul className="mt-3 space-y-2">
            {s.recent.map((r) => (
              <li key={r.id} className="rounded-2xl bg-muted/50 px-4 py-3 text-xs">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="tabular-nums text-muted-foreground">{fmt(r.at)}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${r.source === "server" ? "bg-danger-soft text-danger" : "bg-warning-soft text-warning"}`}>{r.source}{r.route_type ? ` · ${r.route_type}` : ""}</span>
                  {r.path && <span className="font-mono text-muted-foreground">{r.method ?? ""} {r.path}</span>}
                  {r.digest && <span className="font-mono text-muted-foreground">#{r.digest}</span>}
                </div>
                <div className="mt-1 font-medium">{r.message}</div>
                {r.stack && (
                  <details className="mt-1">
                    <summary className="cursor-pointer text-muted-foreground">스택</summary>
                    <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap rounded-xl bg-background p-3 font-mono text-[11px] leading-relaxed">{r.stack}</pre>
                  </details>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
