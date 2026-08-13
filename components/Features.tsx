import {
  Target,
  ListChecks,
  Globe2,
  CheckCircle2,
  LayoutDashboard,
  ShieldCheck,
} from "lucide-react";
import type { Dict } from "@/lib/i18n";

// Structural config (icon / visual / layout) — text comes from the dictionary.
const layout = [
  { icon: Target, span: "lg:col-span-2", visual: "match" },
  { icon: ListChecks, visual: "steps" },
  { icon: Globe2, visual: "globe" },
  { icon: CheckCircle2, visual: "review" },
  { icon: LayoutDashboard, visual: "dashboard" },
  { icon: ShieldCheck, span: "lg:col-span-2", visual: "shield" },
];

export function Features({ dict }: { dict: Dict["features"] }) {
  return (
    <section id="features" className="py-28 lg:py-36">
      <div className="mx-auto w-full max-w-360 px-5 md:px-10 lg:px-16">
        <SectionLabel>{dict.label}</SectionLabel>
        <h2 className="display mt-4 max-w-3xl text-4xl font-semibold lg:text-6xl">
          {dict.heading1}
          <br />
          <span className="text-muted-foreground">{dict.heading2}</span>
        </h2>

        <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {dict.cards.map((card, i) => (
            <FeatureCard
              key={card.title}
              icon={layout[i].icon}
              span={layout[i].span}
              visual={layout[i].visual}
              title={card.title}
              desc={card.desc}
              visuals={dict.visuals}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  desc,
  span,
  visual,
  visuals,
}: {
  icon: typeof Target;
  title: string;
  desc: string;
  span?: string;
  visual: string;
  visuals: Dict["features"]["visuals"];
}) {
  return (
    <div
      className={`group relative flex flex-col overflow-hidden rounded-3xl glass-card p-7 transition-colors hover:bg-muted/50 ${span ?? ""}`}
    >
      <div className="flex size-11 items-center justify-center rounded-2xl bg-accent-soft text-accent-ink">
        <Icon className="size-5" strokeWidth={1.8} />
      </div>
      <h3 className="mt-6 text-lg font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
      <div className="pointer-events-none mt-7 flex flex-1 items-end">
        <FeatureVisual kind={visual} visuals={visuals} />
      </div>
    </div>
  );
}

function FeatureVisual({
  kind,
  visuals,
}: {
  kind: string;
  visuals: Dict["features"]["visuals"];
}) {
  if (kind === "match") {
    return (
      <div className="flex w-full items-center gap-2">
        {visuals.matchTags.map((t, i) => (
          <span
            key={t}
            className={`rounded-full border border-border px-3 py-1 text-xs ${
              i === 0
                ? "border-accent/30 bg-accent-soft text-accent-ink"
                : "bg-background text-muted-foreground"
            }`}
          >
            {t}
          </span>
        ))}
      </div>
    );
  }
  if (kind === "steps") {
    return (
      <div className="flex w-full items-center gap-1">
        {[1, 2, 3, 4, 5].map((s, i) => (
          <div key={s} className="flex flex-1 items-center gap-1">
            <div
              className={`flex size-6 items-center justify-center rounded-full text-[10px] font-medium ${
                i < 3 ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
              }`}
            >
              {s}
            </div>
            {s < 5 && <div className="h-px flex-1 bg-border" />}
          </div>
        ))}
      </div>
    );
  }
  if (kind === "globe") {
    return (
      <div className="flex w-full flex-wrap gap-1.5">
        {["🇰🇷", "🇯🇵", "🇺🇸", "🇹🇭", "🇻🇳", "🇮🇩"].map((f) => (
          <span
            key={f}
            className="flex size-8 items-center justify-center rounded-lg border border-border bg-muted text-base"
          >
            {f}
          </span>
        ))}
      </div>
    );
  }
  if (kind === "review") {
    return (
      <div className="flex w-full gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-muted/60 p-2"
          >
            <div className="size-6 rounded-full bg-foreground/80" />
            <div className="h-1.5 flex-1 rounded-full bg-border" />
          </div>
        ))}
      </div>
    );
  }
  if (kind === "dashboard") {
    return (
      <div className="grid w-full grid-cols-3 gap-1.5">
        <div className="col-span-2 h-12 rounded-lg bg-muted" />
        <div className="row-span-2 rounded-lg bg-accent-soft" />
        <div className="col-span-2 h-6 rounded-lg bg-muted" />
      </div>
    );
  }
  if (kind === "shield") {
    return (
      <div className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border bg-muted/60 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-full bg-foreground" />
          <div>
            <div className="text-xs font-medium">{visuals.shieldTitle}</div>
            <div className="text-[10px] text-muted-foreground">{visuals.shieldSub}</div>
          </div>
        </div>
        <span className="rounded-full bg-accent-soft px-3 py-1 text-[10px] font-medium text-accent-ink">
          {visuals.shieldStatus}
        </span>
      </div>
    );
  }
  return null;
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-accent-ink">
      <span className="size-1.5 rounded-full bg-accent" />
      {children}
    </div>
  );
}
