import { redirect } from "next/navigation";
import { Check, Sparkles } from "lucide-react";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { TaxInvoiceButton } from "./TaxInvoiceButton";
import { AutopayPanel } from "./AutopayPanel";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { isBillingConfigured } from "@/lib/payments/toss";
import { isSubscriptionActive } from "@/lib/plans/active";

export const metadata = { title: "구독·결제 — 루비AI" };

const TIER_ORDER = ["free", "business", "enterprise"] as const;

const TIER_COPY: Record<
  string,
  { desc: string; features: string[]; cta: string }
> = {
  free: {
    desc: "처음 시작하는 브랜드를 위한 무료 플랜",
    features: ["캠페인 1건 무료 등록", "응모자 10명까지 열람", "기본 통계 대시보드", "이메일 지원"],
    cta: "다운그레이드 문의",
  },
  business: {
    desc: "성장 단계의 브랜드를 위한 표준 플랜",
    features: [
      "캠페인 무제한 등록",
      "AI 매칭 풀패키지",
      "고급 대시보드 · 우선 노출",
      "응모자 무제한 열람",
      "전용 채팅 지원",
    ],
    cta: "업그레이드 문의",
  },
  enterprise: {
    desc: "글로벌 멀티 브랜드를 위한 전담 플랜",
    features: ["전담 매니저 배정", "API · SSO 연동", "글로벌 멀티 브랜드 운영", "커스텀 SLA", "법무·세무 컨설팅"],
    cta: "상담 문의",
  },
};

function formatPrice(monthly: number) {
  if (monthly === 0) return "₩0";
  return `₩${monthly.toLocaleString()}`;
}

export default async function BillingPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login?redirect=/dashboard/billing");
  if (profile.role !== "advertiser") redirect("/dashboard");

  const supabase = await createClient();

  const { getAiQuota } = await import("@/lib/ai/quota");
  const aiQuota = await getAiQuota(profile.id);
  const [{ data: subscription }, { data: plans }, { data: paymentRows }] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("id, status, started_at, expires_at, plan_id, auto_renew, grace_until, renew_last_error")
      .eq("advertiser_id", profile.id)
      .maybeSingle(),
    supabase.from("plans").select("id, name, tier, monthly_price").order("monthly_price"),
    supabase.from("payments").select("id, order_name, amount, status, payment_key, kind, approved_at, created_at, tax_invoice_requested_at, tax_invoice_issued_at").eq("advertiser_id", profile.id).order("created_at", { ascending: false }).limit(24),
  ]);

  // 결제창만 열고 끝난 주문(ready·결제 키 없음)은 숨기고, 가상계좌 입금 대기(ready·결제 키 있음)는 보여준다
  const historyRows = (paymentRows ?? []).filter((p) => p.status !== "ready" || p.payment_key || p.kind !== "one_time");
  // 만료된 구독은 FREE 로 보인다(자동결제 실패 유예 중이면 유지)
  const subActive = isSubscriptionActive(subscription);
  const currentPlan = (plans ?? []).find((p) => (subActive ? p.id === subscription?.plan_id : p.tier === "free"));
  const currentTier = currentPlan?.tier ?? "free";

  // 자동결제 — 카드(빌링키) 테이블은 service_role 전용이라 본인 것만 서버에서 조회
  const billingEnabled = isBillingConfigured();
  const { data: card } = billingEnabled
    ? await getAdminSupabase().from("billing_methods").select("card_company, card_number").eq("advertiser_id", profile.id).eq("status", "active").maybeSingle()
    : { data: null };
  const nowMs = Date.now();
  const inGrace = !!subscription?.expires_at && new Date(subscription.expires_at).getTime() <= nowMs && !!subscription.grace_until && new Date(subscription.grace_until).getTime() > nowMs;
  const businessActive = currentTier === "business" && !!subscription?.expires_at && new Date(subscription.expires_at).getTime() > nowMs;
  const autoRenewOn = !!subscription?.auto_renew && (businessActive || inGrace);
  const businessPrice = (plans ?? []).find((p) => p.tier === "business")?.monthly_price ?? 0;
  const sortedPlans = [...(plans ?? [])].sort(
    (a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier)
  );

  return (
    <div>
      <h1 className="display text-3xl font-semibold lg:text-4xl">구독·결제</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        현재 플랜과 사용 중인 혜택을 확인하고, 필요에 따라 업그레이드하세요.
      </p>

      {/* Current plan summary */}
      <div className="mt-8 rounded-3xl glass-card p-6 lg:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              현재 플랜
            </div>
            <div className="mt-2 flex items-baseline gap-3">
              <span className="display text-3xl font-semibold">
                {currentPlan?.name ?? "FREE"}
              </span>
              <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent-ink">
                {inGrace ? "결제 확인 필요" : "사용중"}
              </span>
            </div>
            {subActive && currentTier !== "free" && subscription?.started_at && (
              <p className="mt-2 text-xs text-muted-foreground">
                시작일: {new Date(subscription.started_at).toLocaleDateString("ko-KR")}
                {subscription.expires_at &&
                  ` · 만료일: ${new Date(subscription.expires_at).toLocaleDateString("ko-KR")}`}
              </p>
            )}
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">이번 달 AI 사용</span>
                <span className="tabular-nums font-medium">
                  {aiQuota.used}{aiQuota.limit !== null ? ` / ${aiQuota.limit}회` : "회 · 무제한"}
                </span>
              </div>
              {aiQuota.limit !== null && (
                <div className="mt-1.5 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${aiQuota.used >= aiQuota.limit ? "bg-warning" : "bg-accent"}`}
                    style={{ width: `${Math.min(100, Math.round((aiQuota.used / aiQuota.limit) * 100))}%` }}
                  />
                </div>
              )}
              <p className="mt-1 text-[11px] text-muted-foreground">
                캠페인 작성·매칭·적합도·검수·요약 등 모든 AI 기능 합산 · 매월 1일 초기화
                {aiQuota.tier === "free" ? " · BUSINESS 는 월 300회" : ""}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="display text-2xl font-semibold">
              {formatPrice(currentPlan?.monthly_price ?? 0)}
              <span className="text-sm font-normal text-muted-foreground"> / 월</span>
            </div>
          </div>
        </div>
      </div>

      {/* Plan comparison */}
      <h2 className="mt-12 text-lg font-semibold tracking-tight">플랜 비교</h2>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {sortedPlans.map((plan) => {
          const copy = TIER_COPY[plan.tier] ?? TIER_COPY.free;
          const isCurrent = plan.tier === currentTier;
          const isBusiness = plan.tier === "business";
          return (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-3xl border p-7 ${
                isBusiness
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background"
              }`}
            >
              {isBusiness && (
                <span className="absolute -top-3 left-7 inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-[11px] font-medium text-background">
                  <Sparkles className="size-3" />
                  추천
                </span>
              )}
              <div
                className={`text-xs font-medium uppercase tracking-[0.18em] ${
                  isBusiness ? "text-background/60" : "text-muted-foreground"
                }`}
              >
                {plan.name}
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="display text-3xl font-semibold">
                  {plan.tier === "enterprise" ? "Custom" : formatPrice(plan.monthly_price)}
                </span>
                {plan.tier !== "enterprise" && (
                  <span
                    className={`text-sm ${isBusiness ? "text-background/60" : "text-muted-foreground"}`}
                  >
                    / 월
                  </span>
                )}
              </div>
              <p
                className={`mt-2 text-sm ${isBusiness ? "text-background/70" : "text-muted-foreground"}`}
              >
                {copy.desc}
              </p>
              <ul className="mt-6 flex-1 space-y-2.5">
                {copy.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <Check
                      className={`mt-0.5 size-4 shrink-0 ${isBusiness ? "text-accent" : "text-accent-ink"}`}
                      strokeWidth={2.5}
                    />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              {isCurrent && plan.tier === "business" && billingEnabled && autoRenewOn ? (
                <a
                  href="#autopay"
                  className="mt-8 block w-full rounded-full bg-background px-6 py-3 text-center text-sm font-medium text-foreground transition-colors hover:bg-background/90"
                >
                  자동결제 이용 중
                </a>
              ) : plan.tier === "business" && billingEnabled ? (
                <div className="mt-8 space-y-2">
                  <a
                    href="/dashboard/billing/checkout"
                    className="block w-full rounded-full bg-background px-6 py-3 text-center text-sm font-medium text-foreground transition-colors hover:bg-background/90"
                  >
                    {isCurrent ? "연장하기" : `${formatPrice(plan.monthly_price)} 결제하기`}
                  </a>
                  <p className="text-center text-[11px] text-background/60">월 구독(정기결제) · 단건 결제 중 선택</p>
                </div>
              ) : isCurrent && plan.tier === "business" ? (
                <a
                  href="/dashboard/billing/checkout"
                  className="mt-8 block w-full rounded-full bg-background px-6 py-3 text-center text-sm font-medium text-foreground transition-colors hover:bg-background/90"
                >
                  갱신하기 (+30일 연장)
                </a>
              ) : isCurrent ? (
                <div className="mt-8 w-full rounded-full border border-border px-6 py-3 text-center text-sm font-medium text-muted-foreground">
                  현재 사용중
                </div>
              ) : plan.tier === "business" ? (
                <a
                  href="/dashboard/billing/checkout"
                  className="mt-8 w-full rounded-full bg-background px-6 py-3 text-center text-sm font-medium text-foreground transition-colors hover:bg-background/90"
                >
                  카드로 결제하기
                </a>
              ) : (
                <a
                  href={`mailto:contact@plander.io?subject=${encodeURIComponent(
                    `[루비AI] ${plan.name} 플랜 ${plan.tier === "enterprise" ? "상담" : "업그레이드"} 문의`
                  )}&body=${encodeURIComponent(
                    `계정: ${profile.email}\n현재 플랜: ${currentPlan?.name ?? "FREE"}\n희망 플랜: ${plan.name}\n\n문의 내용을 적어주세요.`
                  )}`}
                  className="mt-8 w-full rounded-full border border-border bg-background px-6 py-3 text-center text-sm font-medium transition-colors hover:bg-muted"
                >
                  {copy.cta}
                </a>
              )}
            </div>
          );
        })}
      </div>

      {billingEnabled && (card || subscription?.auto_renew) && (
        <AutopayPanel
          cardLabel={card ? [card.card_company, card.card_number].filter(Boolean).join(" ") || "등록 카드" : null}
          autoRenew={autoRenewOn}
          businessActive={businessActive}
          expiresAt={subscription?.expires_at ?? null}
          graceUntil={inGrace ? subscription!.grace_until : null}
          lastError={subscription?.renew_last_error ?? null}
          price={businessPrice}
        />
      )}

      {/* 결제 내역 + 세금계산서 요청 */}
      {historyRows.length > 0 && (
        <section className="mt-10">
          <h2 className="display text-2xl font-semibold">결제 내역</h2>
          <p className="mt-1 text-xs text-muted-foreground">카드 결제는 카드 매출전표가 적격증빙이에요. 세금계산서가 필요하면 요청해 주세요 — 설정의 세금계산서 정보(대표자·주소·수신 이메일)로 발행됩니다.</p>
          <ul className="mt-4 divide-y divide-border rounded-3xl glass-card">
            {historyRows.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 text-sm">
                <div className="min-w-0">
                  <div className="font-medium">{p.order_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(p.approved_at ?? p.created_at).toLocaleDateString("ko-KR")} · {p.status === "paid" ? "결제 완료" : p.status === "failed" ? "실패" : p.status === "cancelled" ? "취소" : p.kind !== "one_time" ? "확인 중" : "입금 대기"}{p.kind !== "one_time" ? " · 자동결제" : ""}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold tabular-nums">₩{p.amount.toLocaleString()}</span>
                  {p.status === "paid" && <TaxInvoiceButton paymentId={p.id} requestedAt={p.tax_invoice_requested_at} issuedAt={p.tax_invoice_issued_at} />}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-8 rounded-2xl border border-accent/30 bg-accent-soft/50 px-5 py-4 text-sm text-accent-ink">
        💳 BUSINESS 플랜은 토스페이먼츠로 안전하게 결제됩니다. ENTERPRISE 플랜은 상담 문의를
        주시면 담당자가 24시간 이내에 연락드려요.
      </div>
    </div>
  );
}
