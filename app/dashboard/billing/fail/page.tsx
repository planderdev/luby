import Link from "next/link";
import { XCircle, ArrowRight } from "lucide-react";
import { logError } from "@/lib/error-log";
import { getCurrentProfile } from "@/lib/supabase/queries";

export const metadata = { title: "결제 실패 — 루비AI" };

export default async function PaymentFailPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; message?: string; from?: string }>;
}) {
  const params = await searchParams;
  const message = params.message ?? "결제가 취소되었거나 실패했습니다.";
  const code = params.code;
  // 자동결제 카드 등록창에서 실패·취소하면 from=autopay 로 온다
  const autopay = params.from === "autopay";
  // 진단: 구매자 취소(PAY_PROCESS_CANCELED)가 아닌 실패는 오류 기록에 남긴다 — 카드 등록·결제가 왜 막혔는지 운영자가 볼 수 있게
  if (code && code !== "PAY_PROCESS_CANCELED") {
    const me = await getCurrentProfile().catch(() => null);
    await logError({
      source: "server",
      message: `[billing/fail] ${autopay ? "정기결제 카드 등록" : "단건 결제"} ${code}: ${message}`.slice(0, 500),
      path: "/dashboard/billing/fail",
      userId: me?.id ?? null,
    });
  } else if (code) {
    console.info("[billing/fail] canceled by buyer", autopay ? "autopay" : "one_time");
  }

  return (
    <div className="mx-auto max-w-lg py-12 text-center">
      <div className="mx-auto flex size-16 items-center justify-center rounded-3xl bg-accent-soft">
        <XCircle className="size-8 text-accent-ink" />
      </div>
      <h1 className="display mt-6 text-3xl font-semibold">{autopay ? "카드 등록에 실패했습니다" : "결제에 실패했습니다"}</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        {message}
        {code && <span className="mt-1 block text-xs">오류 코드: {code}</span>}
      </p>
      <div className="mt-8 flex flex-col items-center justify-center gap-2 sm:flex-row">
        <Link
          href={autopay ? "/dashboard/billing/autopay" : "/dashboard/billing/checkout"}
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
      </div>
      <p className="mt-8 text-xs text-muted-foreground">
        문제가 계속되면{" "}
        <a href="mailto:contact@plander.io" className="underline">
          contact@plander.io
        </a>
        로 문의해주세요.
      </p>
    </div>
  );
}
