import { ArrowRight } from "lucide-react";
import { SectionLabel } from "./Features";
import type { Dict } from "@/lib/i18n";

export function HowItWorks({ dict }: { dict: Dict["howItWorks"] }) {
  return (
    <section id="how" className="border-t border-border bg-muted/40 py-28 lg:py-36">
      <div className="mx-auto w-full max-w-360 px-5 md:px-10 lg:px-16">
        <SectionLabel>{dict.label}</SectionLabel>
        <h2 className="display mt-4 max-w-3xl text-4xl font-semibold lg:text-6xl">
          {dict.heading1}
          <br />
          <span className="text-muted-foreground">{dict.heading2}</span>
        </h2>

        <div className="mt-14 grid gap-4 lg:grid-cols-2">
          <FlowColumn column={dict.advertiser} href="/signup?role=advertiser" />
          <FlowColumn column={dict.creator} href="/signup?role=influencer" mirrored />
        </div>
      </div>
    </section>
  );
}

function FlowColumn({
  column,
  href,
  mirrored,
}: {
  column: Dict["howItWorks"]["advertiser"];
  href: string;
  mirrored?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-3xl glass-card p-7 lg:p-10 ${
        mirrored ? "lg:bg-foreground lg:text-background" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <span
          className={`rounded-full px-3 py-1 text-[11px] font-medium tracking-[0.16em] ${
            mirrored
              ? "bg-background/10 text-background lg:bg-background/15"
              : "bg-accent-soft text-accent-ink"
          }`}
        >
          {column.badge}
        </span>
        <span
          className={`text-xs ${
            mirrored ? "text-background/60" : "text-muted-foreground"
          }`}
        >
          {column.desc}
        </span>
      </div>

      <h3 className="display mt-6 text-3xl font-semibold lg:text-4xl">{column.title}</h3>

      <div className="mt-8 space-y-3">
        {column.steps.map((s, i) => (
          <div
            key={s.title}
            className={`flex items-start gap-4 rounded-2xl px-4 py-4 ${
              mirrored
                ? "bg-background/5 lg:bg-background/[0.06]"
                : "bg-muted"
            }`}
          >
            <div
              className={`flex size-9 shrink-0 items-center justify-center rounded-xl text-xs font-semibold ${
                mirrored
                  ? "bg-background text-foreground"
                  : "bg-foreground text-background"
              }`}
            >
              {String(i + 1).padStart(2, "0")}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">{s.title}</div>
              <div
                className={`mt-0.5 text-xs ${
                  mirrored ? "text-background/60" : "text-muted-foreground"
                }`}
              >
                {s.desc}
              </div>
            </div>
            {i < column.steps.length - 1 && (
              <ArrowRight
                className={`mt-2 size-4 shrink-0 ${
                  mirrored ? "text-background/40" : "text-muted-foreground"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      <a
        href={href}
        className={`mt-8 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-colors ${
          mirrored
            ? "bg-background text-foreground hover:bg-background/90"
            : "border border-border bg-background hover:bg-muted"
        }`}
      >
        {column.cta}
        <ArrowRight className="size-4" />
      </a>
    </div>
  );
}
