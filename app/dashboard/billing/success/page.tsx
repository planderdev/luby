import { redirect } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { confirmBusinessPayment } from "../actions";
import { trackServer } from "@/lib/analytics-server";

export const metadata = { title: "결제 완료 — 루비AI" };

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ paymentKey?: string; orderId?: string; amount?: string }>;
}) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const params = await searchParams;
  const paymentKey = params.paymentKey ?? "";
  const orderId = params.orderId ?? "";
  const amount = Number(params.amount ?? 0);

  if (!paymentKey || !orderId || !amount) {
    redirect("/dashboard/billing");
  }

  // 서버에서 토스 승인 + 구독 업그레이드 (멱등 — 새로고침해도 안전)
  const result = await confirmBusinessPayment({ paymentKey, orderId, amount });
  if (result.ok && !result.alreadyPaid) {
    await trackServer("payment_completed", { plan: result.planName, amount });
  }

  if (!result.ok) {
    return (
      <ResultShell
        icon={<XCircle className="size-8 text-accent-ink" />}
        title="결제 승인에 실패했습니다"
        desc={result.error}
      >
        <Link
          href="/dashboard/billing/checkout"
          className="inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background"
        >
          다시 시도하기
          <ArrowRight className="size-4" />
        </Link>
        <Link
          href="/dashboard/billing"
          className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-6 py-3 text-sm font-medium hover:bg-muted"
        >
          구독·결제로 돌아가기
        </Link>
      </ResultShell>
    );
  }

  const expires = result.expiresAt
    ? new Date(result.expiresAt).toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  return (
    <ResultShell
      icon={<CheckCircle2 className="size-8 text-accent" />}
      title={`${result.planName} 플랜 결제 완료 🎉`}
      desc={
        expires
          ? `지금부터 ${expires}까지 ${result.planName} 플랜의 모든 혜택이 적용됩니다.`
          : `${result.planName} 플랜의 모든 혜택이 적용되었습니다.`
      }
    >
      <Link
        href="/dashboard/campaigns/new"
        className="inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background"
      >
        새 캠페인 만들기
        <ArrowRight className="size-4" />
      </Link>
      <Link
        href="/dashboard/billing"
        className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-6 py-3 text-sm font-medium hover:bg-muted"
      >
        구독 현황 보기
      </Link>
    </ResultShell>
  );
}

function ResultShell({
  icon,
  title,
  desc,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-lg py-12 text-center">
      <div className="mx-auto flex size-16 items-center justify-center rounded-3xl bg-accent-soft">
        {icon}
      </div>
      <h1 className="display mt-6 text-3xl font-semibold">{title}</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{desc}</p>
      <div className="mt-8 flex flex-col items-center justify-center gap-2 sm:flex-row">
        {children}
      </div>
    </div>
  );
}
