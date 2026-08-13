import { Wand2, Sparkles, ArrowDown, Check, Star } from "lucide-react";
import { SectionLabel } from "./Features";
import type { ExtraDict } from "@/lib/i18n/landing-extra";

/**
 * AI 딥다이브 — 루비의 가장 강한 차별점(AI 캠페인 라이터 + AI 매칭)을
 * 두 개의 대형 패널로 자세히 보여준다.
 */
export function AICapability({ dict }: { dict: ExtraDict["aiCapability"] }) {
  // SocialProof(muted 스트립)와 이어지는 muted 밴드 — border-t 생략 (이중 보더 방지)
  return (
    <section id="ai" className="bg-muted/40 py-28 lg:py-36">
      <div className="mx-auto w-full max-w-360 px-5 md:px-10 lg:px-16">
        <SectionLabel>{dict.label}</SectionLabel>
        <h2 className="display mt-4 max-w-3xl text-4xl font-semibold lg:text-6xl">
          {dict.heading1}
          <br />
          <span className="text-muted-foreground">{dict.heading2}</span>
        </h2>
        <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground">
          {dict.sub}
        </p>

        <div className="mt-14 grid gap-4 lg:grid-cols-2">
          {/* Panel 1 — AI Campaign Writer */}
          <div className="flex flex-col overflow-hidden rounded-3xl glass-card p-7 lg:p-9">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-[11px] font-semibold tracking-wide text-accent-ink">
              <Wand2 className="size-3" />
              {dict.writer.badge}
            </span>
            <h3 className="mt-5 text-2xl font-semibold tracking-tight">{dict.writer.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {dict.writer.desc}
            </p>

            {/* Mock: input → outputs */}
            <div className="mt-7 flex flex-1 flex-col rounded-2xl border border-border bg-muted/40 p-5">
              <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {dict.writer.inputLabel}
              </div>
              <div className="mt-2 rounded-xl border border-border bg-background px-4 py-3 text-sm">
                {dict.writer.inputExample}
              </div>

              <div className="my-4 flex items-center justify-center gap-2 text-muted-foreground">
                <ArrowDown className="size-4" />
                <Sparkles className="size-3.5 text-accent" />
              </div>

              <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {dict.writer.outputLabel}
              </div>
              <ul className="mt-2 space-y-1.5">
                {dict.writer.outputs.map((o) => (
                  <li
                    key={o}
                    className="flex items-center gap-2 rounded-xl bg-background px-4 py-2.5 text-sm"
                  >
                    <Check className="size-3.5 shrink-0 text-accent" strokeWidth={2.5} />
                    {o}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Panel 2 — AI Matcher */}
          <div className="flex flex-col overflow-hidden rounded-3xl glass-card p-7 lg:p-9">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-[11px] font-semibold tracking-wide text-accent-ink">
              <Sparkles className="size-3" />
              {dict.matcher.badge}
            </span>
            <h3 className="mt-5 text-2xl font-semibold tracking-tight">{dict.matcher.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {dict.matcher.desc}
            </p>

            {/* Mock: match results */}
            <div className="mt-7 flex flex-1 flex-col rounded-2xl border border-border bg-muted/40 p-5">
              <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {dict.matcher.sampleTitle}
              </div>
              <div className="mt-3 space-y-2">
                {dict.matcher.matches.map((m, i) => (
                  <div key={m.handle} className="rounded-xl bg-background p-3.5">
                    <div className="flex items-center gap-3">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-foreground text-[11px] font-semibold text-background">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold">{m.handle}</span>
                          <span className="text-[11px] text-muted-foreground">{m.meta}</span>
                        </div>
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-semibold text-accent-ink">
                        <Star className="size-3 fill-current" />
                        {m.score}
                      </span>
                    </div>
                    <p className="mt-2 pl-10 text-xs leading-relaxed text-muted-foreground">
                      {m.reason}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom stats strip */}
        <div className="mt-6 grid gap-4 rounded-3xl glass-card p-7 sm:grid-cols-3 lg:p-9">
          {dict.stats.map((s) => (
            <div key={s.label} className="text-center sm:text-left">
              <div className="display text-3xl font-semibold text-accent-ink lg:text-4xl">
                {s.value}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
