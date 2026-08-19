import { redirect } from "next/navigation";
import { ExportCsvButton } from "@/components/dashboard/ExportCsvButton";
import { CreditCard, CheckCircle2, Clock, XCircle } from "lucide-react";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "결제 내역 — 루비AI" };

const STATUS_META: Record<string, { label: string; tone: string }> = {
  paid: { label: "결제 완료", tone: "bg-success-soft text-success" },
  ready: { label: "대기중", tone: "bg-warning-soft text-warning" },
  failed: { label: "실패", tone: "bg-danger-soft text-danger" },
  cancelled: { label: "취소", tone: "bg-muted text-muted-foreground" },
};

function fmtDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("ko-KR", {
    year: "2-digit",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function OperatorPaymentsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "operator") redirect("/dashboard");

  const supabase = await createClient();

  const [paymentsRes, plansRes] = await Promise.all([
    supabase
      .from("payments")
      .select(
        "id, advertiser_id, plan_id, order_id, order_name, amount, status, method, fail_reason, approved_at, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("plans").select("id, name"),
  ]);

  const payments = paymentsRes.data ?? [];
  const planById = new Map((plansRes.data ?? []).map((p) => [p.id, p.name]));

  // 광고주 정보
  const advIds = [...new Set(payments.map((p) => p.advertiser_id))];
  const { data: profiles } =
    advIds.length > 0
      ? await supabase.from("profiles").select("id, name, email").in("id", advIds)
      : { data: [] };
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  const paidTotal = payments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + p.amount, 0);
  const count = (s: string) => payments.filter((p) => p.status === s).length;

  return (
    <div>
      <h1 className="display text-3xl font-semibold lg:text-4xl">결제 내역</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        토스페이먼츠 결제 기록 전체를 모니터링합니다. (최근 100건)
      </p>
      <div className="mt-4"><ExportCsvButton type="payments" label="결제 CSV" /></div>

      {/* Summary */}
      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          icon={<CreditCard className="size-4" />}
          label="총 결제 성공 금액"
          value={`₩${paidTotal.toLocaleString()}`}
        />
        <SummaryCard
          icon={<CheckCircle2 className="size-4" />}
          label="결제 완료"
          value={`${count("paid")}건`}
        />
        <SummaryCard
          icon={<Clock className="size-4" />}
          label="대기중 (미완료 주문)"
          value={`${count("ready")}건`}
        />
        <SummaryCard
          icon={<XCircle className="size-4" />}
          label="실패·취소"
          value={`${count("failed") + count("cancelled")}건`}
        />
      </div>

      {/* List */}
      <div className="mt-8 space-y-2">
        {payments.map((p) => {
          const buyer = profileById.get(p.advertiser_id);
          const meta = STATUS_META[p.status] ?? STATUS_META.ready;
          return (
            <div key={p.id} className="rounded-2xl glass-card p-4 lg:p-5">
              <div className="flex flex-wrap items-center gap-3">
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${meta.tone}`}>
                  {meta.label}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-semibold">{p.order_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {planById.get(p.plan_id) ?? ""}
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {buyer ? `${buyer.name} (${buyer.email})` : p.advertiser_id.slice(0, 8)}
                    {" · "}
                    <span className="font-mono">{p.order_id.slice(0, 20)}…</span>
                    {p.method && ` · ${p.method}`}
                  </div>
                  {p.fail_reason && (
                    <div className="mt-1 text-xs text-accent-ink">⚠ {p.fail_reason}</div>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <div className="display text-lg font-semibold tabular-nums">
                    ₩{p.amount.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {p.approved_at ? `승인 ${fmtDateTime(p.approved_at)}` : `주문 ${fmtDateTime(p.created_at)}`}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {payments.length === 0 && (
          <div className="rounded-3xl border border-dashed border-border bg-background p-10 text-center text-sm text-muted-foreground">
            아직 결제 기록이 없습니다. 광고주가 BUSINESS 플랜을 결제하면 여기에 표시됩니다.
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-3xl glass-card p-6">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="display mt-3 text-2xl font-semibold">{value}</div>
    </div>
  );
}
