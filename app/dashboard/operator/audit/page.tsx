import { redirect } from "next/navigation";
import Link from "next/link";
import { ScrollText } from "lucide-react";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "운영 기록 — 루비AI" };

const ACTION_LABEL: Record<string, { label: string; tone: string }> = {
  user_approved: { label: "회원 승인", tone: "bg-success-soft text-success" },
  user_unapproved: { label: "승인 해제", tone: "bg-warning-soft text-warning" },
  user_role_changed: { label: "역할 변경", tone: "bg-warning-soft text-warning" },
  campaign_approved: { label: "캠페인 승인", tone: "bg-success-soft text-success" },
  campaign_rejected: { label: "캠페인 반려", tone: "bg-danger-soft text-danger" },
  campaign_cancelled_by_operator: { label: "캠페인 취소(운영)", tone: "bg-danger-soft text-danger" },
  campaign_status_changed: { label: "캠페인 상태 변경", tone: "bg-muted text-muted-foreground" },
  campaign_created_on_behalf: { label: "대행 등록", tone: "bg-accent-soft text-accent-ink" },
  force_match: { label: "강제 매칭", tone: "bg-accent-soft text-accent-ink" },
  withdrawal_paid: { label: "정산 지급", tone: "bg-success-soft text-success" },
  withdrawal_rejected: { label: "정산 반려", tone: "bg-danger-soft text-danger" },
};
const ACTIONS = Object.keys(ACTION_LABEL);

export default async function OperatorAuditPage({ searchParams }: { searchParams: Promise<{ action?: string; actor?: string }> }) {
  const { action, actor } = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "operator") redirect("/dashboard");
  const supabase = await createClient();
  const [{ data: rows }, { data: operators }] = await Promise.all([
    supabase.rpc("get_operator_audit_log", { p_limit: 200, p_action: action && ACTIONS.includes(action) ? action : null, p_actor: actor && /^[0-9a-f-]{36}$/.test(actor) ? actor : null }),
    supabase.from("profiles").select("id, name").eq("role", "operator").order("name"),
  ]);
  const targetHref = (t: string, id: string | null) =>
    !id ? null : t === "campaign" ? `/dashboard/campaigns/${id}` : t === "profile" ? `/dashboard/operator/users` : t === "withdrawal" ? `/dashboard/operator/withdrawals` : null;

  return (
    <div>
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">운영</p>
      <h1 className="display mt-2 flex items-center gap-3 text-3xl font-semibold lg:text-4xl"><ScrollText className="size-7" /> 운영 기록</h1>
      <p className="mt-2 text-sm text-muted-foreground">운영자가 수행한 승인·검수·배정·정산 작업의 기록입니다 (누가·언제·무엇을). 최근 200건.</p>

      <form method="get" className="mt-6 flex flex-wrap items-center gap-2 text-sm">
        <select name="action" defaultValue={action ?? ""} className="rounded-full border border-border bg-background px-4 py-2">
          <option value="">모든 작업</option>
          {ACTIONS.map((a) => (
            <option key={a} value={a}>{ACTION_LABEL[a].label}</option>
          ))}
        </select>
        <select name="actor" defaultValue={actor ?? ""} className="rounded-full border border-border bg-background px-4 py-2">
          <option value="">모든 운영자</option>
          {(operators ?? []).map((o) => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </select>
        <button type="submit" className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background">필터</button>
        {(action || actor) && <Link href="/dashboard/operator/audit" className="text-xs text-muted-foreground hover:text-foreground">초기화</Link>}
      </form>

      <ul className="mt-4 divide-y divide-border rounded-3xl glass-card">
        {(rows ?? []).map((r) => {
          const a = ACTION_LABEL[r.action] ?? { label: r.action, tone: "bg-muted text-muted-foreground" };
          const href = targetHref(r.target_type, r.target_id);
          const meta = (r.meta ?? {}) as Record<string, unknown>;
          const extra = r.action === "force_match" ? `${meta.assigned}명 배정${meta.note ? ` · ${meta.note}` : ""}` : r.action === "withdrawal_rejected" && meta.reason ? `사유: ${meta.reason}` : r.action.startsWith("campaign_") && meta.from ? `${meta.from} → ${meta.to}` : "";
          return (
            <li key={r.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
              <span className="w-36 shrink-0 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
              <span className="w-20 shrink-0 truncate font-medium">{r.actor_name ?? "시스템"}</span>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${a.tone}`}>{a.label}</span>
              <span className="min-w-0 flex-1 truncate">
                {href ? <Link href={href} className="hover:underline underline-offset-2">{r.target_label}</Link> : r.target_label}
                {extra && <span className="ml-2 text-xs text-muted-foreground">{extra}</span>}
              </span>
            </li>
          );
        })}
        {(!rows || rows.length === 0) && <li className="px-5 py-10 text-center text-sm text-muted-foreground">기록이 없어요.</li>}
      </ul>
    </div>
  );
}
