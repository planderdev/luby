"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import { ComingSoonAction } from "./ComingSoon";
import type { Dict } from "@/lib/i18n";

export function Hero({ dict }: { dict: Dict["hero"] }) {
  return (
    <section className="relative overflow-hidden pt-32 pb-24 lg:pt-40 lg:pb-32">
      {/* grid background */}
      <div className="bg-grid bg-grid-mask absolute inset-0 -z-10 opacity-70" />
      {/* soft pink glow — uses accent token for theme adaptivity */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-24 -z-10 h-[420px] w-[820px] -translate-x-1/2 rounded-full opacity-60 blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, rgb(var(--accent) / 0.28), rgb(var(--accent) / 0))",
        }}
      />

      <div className="mx-auto w-full max-w-360 px-5 md:px-10 lg:px-16">
        {/* eyebrow */}
        <div className="flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-4 py-1.5 text-xs font-medium tracking-wider text-muted-foreground backdrop-blur">
            <Sparkles className="size-3.5 text-accent" />
            {dict.eyebrow}
          </span>
        </div>

        {/* headline */}
        <h1 className="display mt-8 text-center text-[clamp(2.5rem,7vw,5.75rem)] font-semibold">
          {dict.headlineLine1}
          <br />
          <span className="relative inline-block">
            {dict.headlineHighlight}
            <svg
              aria-hidden
              viewBox="0 0 320 14"
              className="absolute -bottom-2 left-0 h-3 w-full"
              preserveAspectRatio="none"
            >
              <path
                d="M2 8 C 80 2, 200 14, 318 6"
                stroke="rgb(236 72 153)"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
              />
            </svg>
          </span>
          {dict.headlineSuffix}
        </h1>

        {/* sub */}
        <p className="mx-auto mt-7 max-w-2xl text-center text-base leading-relaxed text-muted-foreground lg:text-lg">
          {dict.sub1}
          <br className="hidden md:block" />
          {dict.sub2}
        </p>

        {/* CTAs */}
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <ComingSoonAction className="btn-neon group inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-bold">
            {dict.ctaPrimary}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </ComingSoonAction>
          <ComingSoonAction className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-7 py-3.5 text-sm font-medium text-foreground transition-colors hover:bg-muted">
            {dict.ctaSecondary}
          </ComingSoonAction>
        </div>

        {/* visual: floating campaign cards */}
        <div className="relative mx-auto mt-20 max-w-5xl">
          <FloatingCards dict={dict.card} />
        </div>
      </div>
    </section>
  );
}

function FloatingCards({ dict }: { dict: Dict["hero"]["card"] }) {
  return (
    <div className="relative grid grid-cols-12 gap-4">
      {/* main central card */}
      <div className="col-span-12 rounded-3xl border border-border bg-background p-6 shadow-[0_8px_40px_-12px_rgb(0_0_0/0.08)] md:col-span-8 md:col-start-3">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-2xl bg-accent-soft" />
            <div>
              <div className="text-sm font-medium">{dict.title}</div>
              <div className="text-xs text-muted-foreground">{dict.id}</div>
            </div>
          </div>
          <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent-ink">
            {dict.status}
          </span>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {dict.stats.map((s) => (
            <div key={s.label} className="rounded-2xl bg-muted px-4 py-3">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {s.label}
              </div>
              <div className="mt-1 text-lg font-semibold">{s.value}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {dict.tags.map((t) => (
            <span
              key={t}
              className="rounded-full border border-border px-2.5 py-0.5 text-[11px] text-muted-foreground"
            >
              #{t}
            </span>
          ))}
        </div>
      </div>

      {/* left mini card */}
      <div className="col-span-6 -mt-10 hidden rounded-2xl border border-border bg-background p-4 shadow-[0_8px_40px_-12px_rgb(0_0_0/0.08)] md:col-span-3 md:col-start-1 md:block">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-full bg-gradient-to-br from-accent to-accent-ink" />
          <div className="flex-1">
            <div className="text-xs font-medium">@haru.tokyo</div>
            <div className="text-[10px] text-muted-foreground">JP · 24.1K</div>
          </div>
        </div>
        <div className="mt-3 text-[11px] text-muted-foreground">{dict.matchScore}</div>
        <div className="mt-1 text-lg font-semibold">94<span className="text-muted-foreground text-sm">/100</span></div>
      </div>

      {/* right mini card */}
      <div className="col-span-6 -mt-6 hidden rounded-2xl border border-border bg-background p-4 shadow-[0_8px_40px_-12px_rgb(0_0_0/0.08)] md:col-span-3 md:col-start-10 md:block">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-full bg-foreground" />
          <div className="flex-1">
            <div className="text-xs font-medium">@minji_seoul</div>
            <div className="text-[10px] text-muted-foreground">KR · 102K</div>
          </div>
        </div>
        <div className="mt-3 text-[11px] text-muted-foreground">{dict.matchScore}</div>
        <div className="mt-1 text-lg font-semibold">97<span className="text-muted-foreground text-sm">/100</span></div>
      </div>
    </div>
  );
}
