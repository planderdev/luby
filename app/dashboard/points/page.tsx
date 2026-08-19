import { redirect } from "next/navigation";
import Link from "next/link";
import { Coins } from "lucide-react";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { WithdrawalForm } from "./WithdrawalForm";

export const metadata = { title: "포인트 — 루비AI" };

const STATUS_LABEL: Record<string, { label: string; tone: string }> = {
  requested: { label: "처리 대기", tone: "bg-warning-soft text-warning" },
  paid: { label: "지급 완료", tone: "bg-success-soft text-success" },
  rejected: { label: "반려", tone: "bg-danger-soft text-danger" },
};

export default async function PointsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "influencer") redirect("/dashboard");

  const supabase = await createClient();
  const [{ data: influencer }, { data: withdrawals }, { data: ledger }] = await Promise.all([
    supabase
      .from("influencers")
      .select("total_points")
      .eq("profile_id", profile.id)
      .maybeSingle(),
    supabase
      .from("point_withdrawals")
      .select("id, amount, bank_name, account_number, status, reject_reason, requested_at")
      .eq("influencer_id", profile.id)
      .order("requested_at", { ascending: false })
      .limit(30),
    supabase.rpc("get_my_point_ledger", { p_limit: 60 }),
  ]);
  const rows = (ledger ?? []) as { occurred_at: string; kind: string; title: string; detail: string; amount: number; ref_id: string | null; link: string | null }[];
  const earnedTotal = rows.filter((r) => r.amount > 0).reduce((s, r) => s + r.amount, 0);
  const referralTotal = rows.filter((r) => r.kind === "earn_referral").reduce((s, r) => s + r.amount, 0);

  const balance = influencer?.total_points ?? 0;

  return (
    <div>
      <h1 className="display text-3xl font-semibold lg:text-4xl">포인트</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        체험단 활동으로 적립한 포인트를 확인하고 출금을 신청하세요.
      </p>

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        <div className="rounded-3xl border border-accent/30 bg-accent-soft/40 p-6">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Coins className="size-4" />
            보유 포인트
          </div>
          <div className="display mt-2 text-4xl font-semibold">
            {balance.toLocaleString()}
            <span className="ml-1 text-lg text-muted-foreground">P</span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">1P = 1원 · 최소 출금 10,000P</p>
        </div>

        <div className="lg:col-span-2">
          <WithdrawalForm balance={balance} />
        </div>
      </div>

      {/* 포인트 내역 (적립·차감 원장) */}
      <section className="mt-10">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="display text-2xl font-semibold">포인트 내역</h2>
          <div className="text-xs text-muted-foreground">
            누적 적립 {earnedTotal.toLocaleString()}P{referralTotal > 0 ? ` · 추천 보상 ${referralTotal.toLocaleString()}P` : ""}
          </div>
        </div>
        {rows.length === 0 ? (
          <div className="mt-4 rounded-3xl border border-dashed border-border bg-background p-8 text-center text-sm text-muted-foreground">
            아직 내역이 없어요. 캠페인에 응모하고 콘텐츠가 승인되면 포인트가 적립됩니다.
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-border rounded-3xl glass-card">
            {rows.map((r, i) => {
              const positive = r.amount > 0;
              const pending = r.kind === "withdraw_pending";
              const label = r.kind === "earn_campaign" ? "콘텐츠 승인" : r.kind === "earn_referral" ? "추천 보상" : r.kind === "withdraw_paid" ? "출금" : r.kind === "withdraw_pending" ? "출금 대기" : "출금 반려";
              const inner = (
                <>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${positive ? "bg-success-soft text-success" : pending ? "bg-warning-soft text-warning" : "bg-muted text-muted-foreground"}`}>{label}</span>
                      <span className="truncate text-sm font-medium">{r.title}</span>
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {r.detail} · {new Date(r.occurred_at).toLocaleDateString("ko-KR", { year: "numeric", month: "numeric", day: "numeric" })}
                    </div>
                  </div>
                  <div className={`shrink-0 text-sm font-semibold ${positive ? "text-success" : r.amount < 0 ? "text-foreground" : "text-muted-foreground"}`}>
                    {r.amount > 0 ? "+" : ""}{r.amount.toLocaleString()}P
                  </div>
                </>
              );
              return (
                <li key={`${r.kind}-${r.ref_id ?? i}-${i}`}>
                  {r.link && r.kind === "earn_campaign" ? (
                    <Link href={r.link} className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-muted/40">{inner}</Link>
                  ) : (
                    <div className="flex items-center justify-between gap-3 px-5 py-3.5">{inner}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="display text-2xl font-semibold">출금 내역</h2>
        {!withdrawals || withdrawals.length === 0 ? (
          <div className="mt-4 rounded-3xl border border-dashed border-border bg-background p-8 text-center text-sm text-muted-foreground">
            아직 출금 내역이 없습니다.
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {withdrawals.map((w) => {
              const info = STATUS_LABEL[w.status] ?? STATUS_LABEL.requested;
              return (
                <div
                  key={w.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl glass-card p-4"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">{w.amount.toLocaleString()}P</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {w.bank_name} {w.account_number} ·{" "}
                      {new Date(w.requested_at).toLocaleDateString("ko-KR")}
                    </div>
                    {w.status === "rejected" && w.reject_reason && (
                      <div className="mt-1 text-xs text-accent-ink">
                        반려 사유: {w.reject_reason} (포인트 환불됨)
                      </div>
                    )}
                  </div>
                  <span className={`rounded-full px-3 py-1 text-[11px] font-medium ${info.tone}`}>
                    {info.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
