"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarClock, CheckCircle2, CreditCard } from "lucide-react";
import { CheckoutClient } from "./CheckoutClient";
import { AutopayClient } from "../autopay/AutopayClient";
import { AutopayTerms } from "../autopay/AutopayTerms";
import type { AutopayOffer } from "@/lib/payments/autopay-offer";

type Method = "subscription" | "one_time";

/**
 * 결제 방식 선택 — 월 구독(정기결제)과 단건 결제를 나란히 보여주고, 고른 쪽의 결제 흐름을 아래에 펼친다.
 * 단건 결제는 처음 고를 때 주문·토스 위젯을 만들고, 이후 탭을 오가도 다시 만들지 않는다(주문 중복 방지).
 */
export function PaymentChooser({
  offer,
  clientKey,
  planName,
  price,
}: {
  offer: Extract<AutopayOffer, { available: true }>;
  clientKey: string | null;
  planName: string;
  price: number;
}) {
  const [method, setMethod] = useState<Method>(offer.autoRenewOn ? "one_time" : "subscription");
  const [oneTimeOpened, setOneTimeOpened] = useState(method === "one_time");
  const won = `₩${price.toLocaleString()}`;

  const pick = (m: Method) => {
    setMethod(m);
    if (m === "one_time") setOneTimeOpened(true);
  };

  const options: { value: Method; icon: React.ReactNode; title: string; badge?: string; lines: string[] }[] = [
    {
      value: "subscription",
      icon: <CalendarClock className="size-5" />,
      title: "월 구독 (정기결제)",
      badge: offer.autoRenewOn ? "이용 중" : "추천",
      lines: [`매월 ${won} 자동결제`, "카드 한 번 등록 · 언제든 해지"],
    },
    {
      value: "one_time",
      icon: <CreditCard className="size-5" />,
      title: "단건 결제",
      lines: [`${won} · 1개월(30일)`, "자동 연장 없음 · 필요할 때마다 결제"],
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="결제 방식">
        {options.map((o) => {
          const on = method === o.value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => pick(o.value)}
              className={`relative flex flex-col items-start gap-2 rounded-3xl border p-5 text-left transition-colors ${
                on ? "border-foreground bg-foreground text-background" : "border-border bg-background hover:bg-muted"
              }`}
            >
              <span className="flex w-full items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 text-sm font-semibold">
                  {o.icon}
                  {o.title}
                </span>
                {on ? (
                  <CheckCircle2 className="size-5 shrink-0" />
                ) : (
                  o.badge && <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent-ink">{o.badge}</span>
                )}
              </span>
              {o.lines.map((l) => (
                <span key={l} className={`text-xs ${on ? "text-background/75" : "text-muted-foreground"}`}>
                  {l}
                </span>
              ))}
            </button>
          );
        })}
      </div>

      {method === "subscription" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{offer.when}</p>
          <AutopayTerms planName={planName} price={price} />
          {offer.autoRenewOn ? (
            <div className="rounded-2xl border border-border bg-muted/30 px-5 py-4 text-sm">
              이미 정기결제를 이용 중이에요({offer.cardLabel}). 카드 변경·해지는{" "}
              <Link href="/dashboard/billing#autopay" className="underline underline-offset-2">
                구독·결제
              </Link>
              에서 할 수 있어요.
            </div>
          ) : (
            <AutopayClient changing={!!offer.cardLabel} cta={offer.cta} />
          )}
        </div>
      )}

      {oneTimeOpened && (
        <div className={method === "one_time" ? "space-y-3" : "hidden"}>
          <p className="text-sm text-muted-foreground">결제 즉시 30일간 {planName} 혜택이 적용되고, 자동으로 연장되지 않아요. 이용 중이면 남은 기간에 이어서 30일이 연장돼요.</p>
          {clientKey ? (
            <CheckoutClient clientKey={clientKey} />
          ) : (
            <div className="rounded-3xl border border-accent/30 bg-accent-soft/50 p-6 text-sm text-accent-ink">단건 결제 모듈이 아직 설정되지 않았습니다.</div>
          )}
        </div>
      )}
    </div>
  );
}
