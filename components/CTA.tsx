import { ArrowRight } from "lucide-react";
import type { Dict } from "@/lib/i18n";

export function CTA({ dict }: { dict: Dict["cta"] }) {
  return (
    <section id="cta" className="py-28 lg:py-36">
      <div className="mx-auto w-full max-w-360 px-5 md:px-10 lg:px-16">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-foreground px-8 py-20 text-background lg:px-20 lg:py-28">
          {/* pink glow */}
          <div
            aria-hidden
            className="pointer-events-none absolute -top-40 left-1/2 size-[640px] -translate-x-1/2 rounded-full opacity-40 blur-3xl"
            style={{
              background:
                "radial-gradient(closest-side, rgb(236 72 153 / 0.55), transparent)",
            }}
          />
          <div
            aria-hidden
            className="bg-grid absolute inset-0 opacity-[0.07]"
          />

          <div className="relative text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-background/15 bg-background/5 px-4 py-1.5 text-xs font-medium tracking-wider text-background/80 backdrop-blur">
              <span className="size-1.5 rounded-full bg-accent" />
              {dict.badge}
            </span>
            <h2 className="display mx-auto mt-6 max-w-3xl text-4xl font-semibold lg:text-6xl">
              {dict.headingLine1}
              <br />
              {dict.headingLine2Pre}
              <span className="text-accent">{dict.headingHighlight}</span>
              {dict.headingLine2Post}
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-background/70">
              {dict.sub}
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href="/signup"
                className="group inline-flex items-center gap-2 rounded-full bg-background px-7 py-3.5 text-sm font-medium text-foreground transition-transform hover:scale-[1.02] active:scale-[0.98]"
              >
                {dict.ctaPrimary}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </a>
              <a
                href="/login"
                className="inline-flex items-center gap-2 rounded-full border border-background/20 px-7 py-3.5 text-sm font-medium text-background transition-colors hover:bg-background/10"
              >
                {dict.login}
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
