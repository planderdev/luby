/**
 * 구독이 지금 유효한가 — active 이고 (만료일 없음 · 만료 전 · 자동결제 실패 유예(grace_until) 중).
 * DB 쪽 같은 규칙: enforce_campaign_limit. 유예는 자동결제 갱신이 실패했을 때 만료 후 3일(lib/payments/billing.ts).
 */
export type SubscriptionLike = { status: string; expires_at: string | null; grace_until?: string | null };

export function isSubscriptionActive(sub: SubscriptionLike | null | undefined, now = Date.now()): boolean {
  if (!sub || sub.status !== "active") return false;
  if (sub.expires_at === null || new Date(sub.expires_at).getTime() > now) return true;
  return !!sub.grace_until && new Date(sub.grace_until).getTime() > now;
}
