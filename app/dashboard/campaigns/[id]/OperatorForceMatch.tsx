"use client";

import { useEffect, useState, useTransition } from "react";
import { Search, UserPlus, Loader2, ShieldCheck, Check } from "lucide-react";
import { searchCreatorsForCampaign, forceMatchCreators } from "../../operator/actions";

type Row = { id: string; name: string; email: string; avatar_url: string | null; region_name: string | null; total_followers: number; categories: string; current_status: string | null };

/** 운영자 전용 — 캠페인에 크리에이터를 직접 배정(선정 상태). 응모 없이도 매칭을 강제할 때 사용 */
export function OperatorForceMatch({ campaignId, campaignStatus }: { campaignId: string; campaignStatus: string }) {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [pending, startTransition] = useTransition();
  const allowed = ["pending_approval", "open", "closed"].includes(campaignStatus);

  async function runSearch(query: string) {
    setSearching(true);
    setError(null);
    const r = await searchCreatorsForCampaign(campaignId, query);
    setSearching(false);
    if (r.ok) setRows(r.rows as Row[]);
    else setError(r.error);
  }
  useEffect(() => {
    if (allowed) void runSearch("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  function toggle(id: string) {
    setPicked((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }
  function assign() {
    setMsg(null);
    setError(null);
    startTransition(async () => {
      const r = await forceMatchCreators(campaignId, [...picked], note);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setMsg(`${r.assigned}명 배정 완료${r.skipped.length ? ` · 건너뜀 ${r.skipped.length}명 (${r.skipped.map((s) => s.reason).join(", ")})` : ""}`);
      setPicked(new Set());
      await runSearch(q);
    });
  }

  const fmt = (n: number) => (n >= 10000 ? `${(n / 10000).toFixed(1).replace(/\.0$/, "")}만` : n.toLocaleString());

  return (
    <section className="mt-10 rounded-3xl border border-accent/30 bg-accent-soft/30 p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-foreground text-background"><ShieldCheck className="size-5" /></div>
          <div>
            <h3 className="text-lg font-semibold tracking-tight">운영자 강제 매칭</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">응모 없이도 크리에이터를 이 캠페인에 <b>선정 상태</b>로 배정합니다. 크리에이터·광고주에게 알림이 갑니다.</p>
          </div>
        </div>
        {!allowed && <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">검수중·모집중·마감 상태에서만 가능</span>}
      </div>

      {allowed && (
        <>
          <form
            className="mt-5 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void runSearch(q);
            }}
          >
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="이름·이메일·소개로 검색" className="w-full rounded-full border border-border bg-background py-2.5 pl-11 pr-4 text-sm outline-none" />
            </div>
            <button type="submit" disabled={searching} className="rounded-full border border-border bg-background px-4 py-2 text-sm hover:bg-muted">
              {searching ? <Loader2 className="size-4 animate-spin" /> : "검색"}
            </button>
          </form>

          <ul className="mt-3 max-h-80 divide-y divide-border overflow-auto rounded-2xl bg-background">
            {rows.map((r) => {
              const on = picked.has(r.id);
              const already = r.current_status === "selected" || r.current_status === "completed";
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => !already && toggle(r.id)}
                    disabled={already}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-muted/50 disabled:opacity-60 ${on ? "bg-accent-soft/60" : ""}`}
                  >
                    <span className={`flex size-5 shrink-0 items-center justify-center rounded-md border ${on ? "border-foreground bg-foreground text-background" : "border-border"}`}>{on && <Check className="size-3.5" />}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate font-medium">{r.name}</span>
                        <span className="truncate text-xs text-muted-foreground">{r.email}</span>
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {r.region_name ?? "—"} · 팔로워 {fmt(Number(r.total_followers))}{r.categories ? ` · ${r.categories}` : ""}
                      </span>
                    </span>
                    {r.current_status && (
                      <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{r.current_status}</span>
                    )}
                  </button>
                </li>
              );
            })}
            {rows.length === 0 && !searching && <li className="px-4 py-6 text-center text-xs text-muted-foreground">검색 결과가 없어요.</li>}
          </ul>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="배정 메모 (선택, 응모 메시지로 기록)" className="min-w-[220px] flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm outline-none" />
            <button
              type="button"
              onClick={assign}
              disabled={pending || picked.size === 0}
              className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background disabled:opacity-50"
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
              {picked.size}명 배정
            </button>
          </div>
          {msg && <p className="mt-2 text-xs text-success">{msg}</p>}
          {error && <p className="mt-2 text-xs text-danger">{error}</p>}
        </>
      )}
    </section>
  );
}
