import Link from "next/link";
import { AlertTriangle, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

/**
 * 광고주 구독 만료 안내 배너.
 * - BUSINESS 만료 7일 이내: 경고 + 갱신 유도 (잔여기간 이월 안내)
 * - 만료 경과: FREE 강등 안내 + 재결제 유도
 */
export async function SubscriptionBanner({ userId }: { userId: string }) {
  const supabase = await createClient();
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("status, expires_at, plans(tier, name)")
    .eq("advertiser_id", userId)
    .maybeSingle();

  const plan = sub?.plans as { tier: string; name: string } | null;
  if (!sub || sub.status !== "active" || !plan || plan.tier === "free" || !sub.expires_at) {
    return null;
  }

  const msLeft = new Date(sub.expires_at).getTime() - Date.now();
  const daysLeft = Math.ceil(msLeft / (24 * 60 * 60 * 1000));

  if (msLeft <= 0) {
    return (
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-danger/30 bg-danger-soft px-5 py-4">
        <div className="flex items-center gap-2.5 text-sm">
          <AlertTriangle className="size-4 shrink-0 text-danger" />
          <span>
            <strong>{plan.name} 구독이 만료되었습니다.</strong> 현재 FREE 플랜으로 이용
            중이에요 — 캠페인 무제한·AI 매칭을 계속 쓰려면 갱신해주세요.
          </span>
        </div>
        <Link
          href="/dashboard/billing/checkout"
          className="btn-neon shrink-0 rounded-full px-4 py-2 text-xs font-bold"
        >
          다시 시작하기
        </Link>
      </div>
    );
  }

  if (daysLeft > 7) return null;

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-warning/30 bg-warning-soft px-5 py-4">
      <div className="flex items-center gap-2.5 text-sm">
        <Sparkles className="size-4 shrink-0 text-warning" />
        <span>
          <strong>
            {plan.name} 구독이 {daysLeft}일 후 만료됩니다.
          </strong>{" "}
          지금 갱신하면 남은 기간에 이어서 30일이 연장돼요.
        </span>
      </div>
      <Link
        href="/dashboard/billing/checkout"
        className="btn-neon shrink-0 rounded-full px-4 py-2 text-xs font-bold"
      >
        지금 갱신하기
      </Link>
    </div>
  );
}
