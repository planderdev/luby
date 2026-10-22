/** 운영 기록(operator_audit_log.action) 표시 이름·색 — 운영 기록 페이지와 회원 상세가 함께 쓴다 */
export const AUDIT_ACTION_LABEL: Record<string, { label: string; tone: string }> = {
  user_approved: { label: "회원 승인", tone: "bg-success-soft text-success" },
  user_unapproved: { label: "승인 해제", tone: "bg-warning-soft text-warning" },
  user_role_changed: { label: "역할 변경", tone: "bg-warning-soft text-warning" },
  plan_overridden: { label: "플랜 강제 설정", tone: "bg-accent-soft text-accent-ink" },
  payment_refunded: { label: "결제 환불", tone: "bg-danger-soft text-danger" },
  campaign_approved: { label: "캠페인 승인", tone: "bg-success-soft text-success" },
  campaign_rejected: { label: "캠페인 반려", tone: "bg-danger-soft text-danger" },
  campaign_cancelled_by_operator: { label: "캠페인 취소(운영)", tone: "bg-danger-soft text-danger" },
  campaign_status_changed: { label: "캠페인 상태 변경", tone: "bg-muted text-muted-foreground" },
  campaign_created_on_behalf: { label: "대행 등록", tone: "bg-accent-soft text-accent-ink" },
  force_match: { label: "강제 매칭", tone: "bg-accent-soft text-accent-ink" },
  withdrawal_paid: { label: "정산 지급", tone: "bg-success-soft text-success" },
  withdrawal_rejected: { label: "정산 반려", tone: "bg-danger-soft text-danger" },
};

const TIER = (t: unknown) => String(t ?? "free").toUpperCase();
const ymd = (iso: unknown) => (typeof iso === "string" && iso ? new Date(iso).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" }) : "무기한");

/** 작업별 한 줄 요약(없으면 빈 문자열) */
export function auditExtra(action: string, meta: Record<string, unknown>): string {
  if (action === "force_match") return `${meta.assigned}명 배정${meta.note ? ` · ${meta.note}` : ""}`;
  if (action === "withdrawal_rejected" && meta.reason) return `사유: ${meta.reason}`;
  if (action === "plan_overridden") {
    const to = meta.to_tier === "free" ? "FREE" : `${TIER(meta.to_tier)}(${ymd(meta.to_expires)}${meta.to_expires ? "까지" : ""})`;
    return `${TIER(meta.from_tier)} → ${to}${meta.reason ? ` · ${meta.reason}` : ""}`;
  }
  if (action === "payment_refunded") {
    const amt = typeof meta.amount === "number" ? `₩${meta.amount.toLocaleString("ko-KR")}` : "";
    return [amt, meta.downgraded ? "FREE 전환" : "플랜 유지", meta.reason ? String(meta.reason) : ""].filter(Boolean).join(" · ");
  }
  if (action.startsWith("campaign_") && meta.from) return `${meta.from} → ${meta.to}`;
  return "";
}
