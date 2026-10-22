import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, CheckCircle2, CreditCard, XCircle } from "lucide-react";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { completeBillingAuth } from "../../actions";
import { cardLabel } from "@/lib/payments/billing";
import { trackServer } from "@/lib/analytics-server";
import { ResultShell } from "../../ResultShell";

export const metadata = { title: "자동결제 등록 — 루비AI" };

const kst = (iso: string) => new Date(iso).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "long", day: "numeric" });

const primary = "inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background";
const secondary = "inline-flex items-center gap-2 rounded-full border border-border bg-background px-6 py-3 text-sm font-medium hover:bg-muted";

export default async function AutopaySuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ customerKey?: string; authKey?: string }>;
}) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  const { customerKey = "", authKey = "" } = await searchParams;
  if (!customerKey || !authKey) redirect("/dashboard/billing");

  // 서버에서 빌링키 발급 → 필요하면 첫 결제(멱등 — 새로고침해도 다시 결제하지 않음)
  const r = await completeBillingAuth({ customerKey, authKey });
  if (r.status === "paid") await trackServer("payment_completed", { plan: r.planName, autopay: true });

  if (r.status === "error") {
    return (
      <ResultShell icon={<XCircle className="size-8 text-accent-ink" />} title="카드를 등록하지 못했어요" desc={r.error}>
        <Link href="/dashboard/billing/autopay" className={primary}>
          다시 시도하기 <ArrowRight className="size-4" />
        </Link>
        <Link href="/dashboard/billing" className={secondary}>
          구독·결제로 돌아가기
        </Link>
      </ResultShell>
    );
  }

  if (r.status === "charge_failed") {
    return (
      <ResultShell
        icon={<CreditCard className="size-8 text-accent-ink" />}
        title={r.pending ? "결제를 확인하고 있어요" : "카드는 등록했지만 결제에 실패했어요"}
        desc={`${cardLabel(r.card)} 카드가 등록됐어요. ${r.error}`}
      >
        <Link href="/dashboard/billing#autopay" className={primary}>
          {r.pending ? "구독·결제에서 확인하기" : "구독·결제에서 다시 결제하기"} <ArrowRight className="size-4" />
        </Link>
        <Link href="/dashboard/billing/autopay" className={secondary}>
          다른 카드 등록하기
        </Link>
      </ResultShell>
    );
  }

  if (r.status === "paid") {
    return (
      <ResultShell
        icon={<CheckCircle2 className="size-8 text-accent" />}
        title={`${r.planName} 자동결제 시작 🎉`}
        desc={`${cardLabel(r.card)} 카드로 결제했어요. ${kst(r.expiresAt)}까지 ${r.planName} 혜택이 적용되고, 그 뒤로는 매월 자동으로 연장돼요.`}
      >
        <Link href="/dashboard/campaigns/new" className={primary}>
          새 캠페인 만들기 <ArrowRight className="size-4" />
        </Link>
        <Link href="/dashboard/billing" className={secondary}>
          구독 현황 보기
        </Link>
      </ResultShell>
    );
  }

  // registered(이용 중이라 다음 갱신부터) · already(새로고침)
  const card = r.card;
  return (
    <ResultShell
      icon={<CheckCircle2 className="size-8 text-accent" />}
      title={r.status === "registered" ? "자동결제 카드를 등록했어요" : "이미 처리된 카드 등록이에요"}
      desc={
        r.status === "registered" && r.nextChargeAt
          ? `${card ? cardLabel(card) : "등록한"} 카드로 ${kst(r.nextChargeAt)}부터 매월 자동결제돼요. 지금은 결제하지 않았어요.`
          : `${card ? `${cardLabel(card)} 카드가 등록돼 있어요. ` : ""}구독·결제에서 자동결제 상태를 확인할 수 있어요.`
      }
    >
      <Link href="/dashboard/billing#autopay" className={primary}>
        구독·결제로 가기 <ArrowRight className="size-4" />
      </Link>
    </ResultShell>
  );
}
