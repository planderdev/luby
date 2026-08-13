import { ShieldCheck, CreditCard, UserCheck, Server } from "lucide-react";
import { SectionLabel } from "./Features";
import type { ExtraDict } from "@/lib/i18n/landing-extra";

const icons = [ShieldCheck, CreditCard, UserCheck, Server];

/**
 * 신뢰·보안 — 실제 아키텍처 사실(RLS, 토스페이먼츠, 3단계 검수,
 * 글로벌 인프라)만 담는다. 허위 인증 배지 금지.
 */
export function Trust({ dict }: { dict: ExtraDict["trust"] }) {
  return (
    <section id="trust" className="border-t border-border bg-muted/40 py-28 lg:py-36">
      <div className="mx-auto w-full max-w-360 px-5 md:px-10 lg:px-16">
        <SectionLabel>{dict.label}</SectionLabel>
        <h2 className="display mt-4 max-w-3xl text-4xl font-semibold lg:text-6xl">
          {dict.heading1}
          <br />
          <span className="text-muted-foreground">{dict.heading2}</span>
        </h2>

        <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {dict.items.map((item, i) => {
            const Icon = icons[i % icons.length];
            return (
              <div
                key={item.title}
                className="rounded-3xl glass-card p-7"
              >
                <div className="flex size-11 items-center justify-center rounded-2xl bg-accent-soft text-accent-ink">
                  <Icon className="size-5" strokeWidth={1.8} />
                </div>
                <h3 className="mt-6 text-base font-semibold tracking-tight">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
              </div>
            );
          })}
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">{dict.footnote}</p>
      </div>
    </section>
  );
}
