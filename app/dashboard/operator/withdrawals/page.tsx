import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { WithdrawalRow } from "./WithdrawalRow";

export const metadata = { title: "정산 관리 — 루비AI" };

export default async function OperatorWithdrawalsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "operator") redirect("/dashboard");

  const supabase = await createClient();
  const { data: withdrawals } = await supabase
    .from("point_withdrawals")
    .select(
      "id, influencer_id, amount, bank_name, account_number, account_holder, status, reject_reason, requested_at"
    )
    .order("requested_at", { ascending: false })
    .limit(100);

  const ids = [...new Set((withdrawals ?? []).map((w) => w.influencer_id))];
  const { data: profiles } =
    ids.length > 0
      ? await supabase.from("profiles").select("id, name, email").in("id", ids)
      : { data: [] };
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  const pending = (withdrawals ?? []).filter((w) => w.status === "requested");
  const processed = (withdrawals ?? []).filter((w) => w.status !== "requested");

  const totalPending = pending.reduce((sum, w) => sum + w.amount, 0);

  return (
    <div>
      <h1 className="display text-3xl font-semibold lg:text-4xl">정산 관리</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        인플루언서 포인트 출금 신청을 확인하고 지급을 처리합니다. 반려 시 포인트는 자동
        환불됩니다.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-3xl glass-card p-5">
          <div className="text-xs text-muted-foreground">처리 대기</div>
          <div className="mt-1 text-2xl font-semibold">{pending.length}건</div>
        </div>
        <div className="rounded-3xl glass-card p-5">
          <div className="text-xs text-muted-foreground">대기 중 지급 예정액</div>
          <div className="mt-1 text-2xl font-semibold">₩{totalPending.toLocaleString()}</div>
        </div>
      </div>

      <section className="mt-10">
        <h2 className="display text-2xl font-semibold">처리 대기 ({pending.length})</h2>
        {pending.length === 0 ? (
          <div className="mt-4 rounded-3xl border border-dashed border-border bg-background p-8 text-center text-sm text-muted-foreground">
            처리 대기 중인 출금 신청이 없습니다.
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {pending.map((w) => {
              const p = profileById.get(w.influencer_id);
              return (
                <WithdrawalRow
                  key={w.id}
                  id={w.id}
                  influencerName={p?.name ?? "—"}
                  influencerEmail={p?.email ?? "—"}
                  amount={w.amount}
                  bankName={w.bank_name}
                  accountNumber={w.account_number}
                  accountHolder={w.account_holder}
                  status={w.status}
                  rejectReason={w.reject_reason}
                  requestedAt={w.requested_at}
                />
              );
            })}
          </div>
        )}
      </section>

      {processed.length > 0 && (
        <section className="mt-10">
          <h2 className="display text-2xl font-semibold">처리 완료</h2>
          <div className="mt-4 space-y-2">
            {processed.map((w) => {
              const p = profileById.get(w.influencer_id);
              return (
                <WithdrawalRow
                  key={w.id}
                  id={w.id}
                  influencerName={p?.name ?? "—"}
                  influencerEmail={p?.email ?? "—"}
                  amount={w.amount}
                  bankName={w.bank_name}
                  accountNumber={w.account_number}
                  accountHolder={w.account_holder}
                  status={w.status}
                  rejectReason={w.reject_reason}
                  requestedAt={w.requested_at}
                />
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
