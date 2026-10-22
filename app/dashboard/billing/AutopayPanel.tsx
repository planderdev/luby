"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { AlertTriangle, CreditCard, Loader2, RefreshCw } from "lucide-react";
import { payNowWithCard, removeBillingCard, setAutoRenew } from "./actions";

const kst = (iso: string) => new Date(iso).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric" });

/**
 * 구독·결제 — 자동결제 상태(카드·다음 결제일·유예)와 해지/다시 켜기·카드 변경·삭제·지금 결제.
 * 권한·상태 검사는 서버 액션이 다시 한다.
 */
export function AutopayPanel({
  cardLabel,
  autoRenew,
  businessActive,
  expiresAt,
  graceUntil,
  lastError,
  price,
}: {
  cardLabel: string | null;
  autoRenew: boolean;
  businessActive: boolean;
  expiresAt: string | null;
  graceUntil: string | null;
  lastError: string | null;
  price: number;
}) {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const won = `₩${price.toLocaleString()}`;
  const nextCharge = autoRenew && businessActive && expiresAt ? new Date(new Date(expiresAt).getTime() - 86_400_000).toISOString() : null;

  const run = (fn: () => Promise<{ ok: boolean; text: string }>) => {
    setMsg(null);
    startTransition(async () => setMsg(await fn()));
  };
  const toggle = (on: boolean) =>
    run(async () => {
      const r = await setAutoRenew(on);
      return r.ok ? { ok: true, text: on ? "자동결제를 다시 켰어요." : "자동결제를 해지했어요. 남은 기간까지 이용할 수 있어요." } : { ok: false, text: r.error };
    });
  const payNow = () =>
    run(async () => {
      const r = await payNowWithCard();
      if (r.status === "paid") return { ok: true, text: `${won}을 결제했어요. ${kst(r.expiresAt)}까지 이용할 수 있어요.` };
      if (r.status === "registered") return { ok: true, text: "자동결제를 켰어요." };
      return { ok: false, text: r.status === "charge_failed" || r.status === "error" ? r.error : "결제하지 못했어요." };
    });
  const remove = () =>
    run(async () => {
      const r = await removeBillingCard();
      return r.ok ? { ok: true, text: "카드를 삭제했어요. 자동결제도 꺼졌어요." } : { ok: false, text: r.error };
    });

  const chip = graceUntil
    ? { text: "결제 실패", tone: "bg-danger-soft text-danger" }
    : autoRenew
      ? { text: "켜짐", tone: "bg-success-soft text-success" }
      : { text: "꺼짐", tone: "bg-muted text-muted-foreground" };

  return (
    <section id="autopay" className="mt-10 scroll-mt-24">
      <h2 className="display flex items-center gap-2 text-2xl font-semibold">
        자동결제 <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${chip.tone}`}>{chip.text}</span>
      </h2>
      <div className="mt-4 rounded-3xl glass-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <span className="inline-flex items-center gap-2">
            <CreditCard className="size-4 text-muted-foreground" />
            {cardLabel ?? "등록된 카드 없음"}
          </span>
          <Link href="/dashboard/billing/autopay" className="text-xs underline underline-offset-2">
            {cardLabel ? "카드 변경" : "카드 등록"}
          </Link>
        </div>

        {graceUntil && (
          <div className="mt-4 flex items-start gap-2 rounded-2xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger" />
            <span>
              자동결제에 실패했어요{lastError ? ` — ${lastError}` : ""}. <b>{kst(graceUntil)}</b>까지 결제되지 않으면 FREE 플랜으로 전환돼요. 매일 오전 10시에 다시
              시도하고, 카드를 바꾸면 바로 결제해요.
            </span>
          </div>
        )}

        <p className="mt-4 text-sm text-muted-foreground">
          {graceUntil
            ? ""
            : nextCharge
              ? `다음 결제: ${kst(nextCharge)} · ${won} (결제 3일 전에 알림을 보내 드려요)`
              : businessActive && expiresAt
                ? `자동결제가 꺼져 있어요. ${kst(expiresAt)}에 만료돼요.`
                : cardLabel
                  ? `등록된 카드로 지금 결제하면 바로 BUSINESS가 시작되고 매월 자동결제돼요.`
                  : ""}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {cardLabel && (graceUntil || !businessActive) && (
            <button type="button" onClick={payNow} disabled={pending} className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-xs font-medium text-background disabled:opacity-50">
              {pending ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />} 지금 {won} 결제하기
            </button>
          )}
          {autoRenew && businessActive && !graceUntil && (
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                if (window.confirm("자동결제를 해지할까요? 남은 기간까지는 계속 이용할 수 있어요.")) toggle(false);
              }}
              className="rounded-full border border-border bg-background px-4 py-2 text-xs font-medium hover:bg-muted disabled:opacity-50"
            >
              자동결제 해지
            </button>
          )}
          {!autoRenew && businessActive && cardLabel && (
            <button type="button" onClick={() => toggle(true)} disabled={pending} className="rounded-full bg-foreground px-4 py-2 text-xs font-medium text-background disabled:opacity-50">
              자동결제 다시 켜기
            </button>
          )}
          {cardLabel && (
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                if (window.confirm("등록된 카드를 삭제할까요? 자동결제도 함께 꺼져요.")) remove();
              }}
              className="rounded-full px-3 py-2 text-xs text-muted-foreground hover:bg-muted disabled:opacity-50"
            >
              카드 삭제
            </button>
          )}
        </div>
        {msg && <p className={`mt-3 text-xs ${msg.ok ? "text-success" : "text-accent-ink"}`}>{msg.text}</p>}
      </div>
    </section>
  );
}
