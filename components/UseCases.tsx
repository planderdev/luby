import { Check } from "lucide-react";
import { SectionLabel } from "./Features";
import type { ExtraDict } from "@/lib/i18n/landing-extra";

/**
 * 활용 사례 — 업종별 시나리오 3종. 가상의 고객 후기 대신
 * "어떤 팀의 어떤 문제를 어떻게 푸는지"를 정직하게 보여준다.
 */
export function UseCases({ dict }: { dict: ExtraDict["useCases"] }) {
  return (
    <section id="use-cases" className="border-t border-border py-28 lg:py-36">
      <div className="mx-auto w-full max-w-360 px-5 md:px-10 lg:px-16">
        <SectionLabel>{dict.label}</SectionLabel>
        <h2 className="display mt-4 max-w-3xl text-4xl font-semibold lg:text-6xl">
          {dict.heading1}
          <br />
          <span className="text-muted-foreground">{dict.heading2}</span>
        </h2>

        <div className="mt-14 grid gap-4 lg:grid-cols-3">
          {dict.cases.map((c) => (
            <div
              key={c.title}
              className="flex flex-col rounded-3xl glass-card p-7 transition-colors hover:bg-muted/40"
            >
              <div className="flex size-12 items-center justify-center rounded-2xl bg-muted text-2xl">
                {c.emoji}
              </div>
              <h3 className="mt-5 text-lg font-semibold tracking-tight">{c.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{c.scenario}</p>
              <ul className="mt-6 space-y-2.5 border-t border-border pt-5">
                {c.wins.map((w) => (
                  <li key={w} className="flex items-start gap-2.5 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-accent-ink" strokeWidth={2.5} />
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
