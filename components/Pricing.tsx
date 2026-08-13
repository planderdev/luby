import { Check } from "lucide-react";
import { SectionLabel } from "./Features";
import type { Dict } from "@/lib/i18n";

// Plan name / price / layout are locale-independent; text comes from the dictionary.
const planLayout = [
  { name: "FREE", price: "₩0", primary: false, href: "/signup?role=advertiser" },
  { name: "BUSINESS", price: "₩1,800,000", primary: true, href: "/signup?role=advertiser" },
  {
    name: "ENTERPRISE",
    price: "Custom",
    primary: false,
    href: "mailto:contact@plander.io?subject=%5BLuby%20AI%5D%20ENTERPRISE%20%ED%94%8C%EB%9E%9C%20%EC%83%81%EB%8B%B4%20%EB%AC%B8%EC%9D%98",
  },
];

export function Pricing({ dict }: { dict: Dict["pricing"] }) {
  return (
    <section id="pricing" className="border-t border-border py-28 lg:py-36">
      <div className="mx-auto w-full max-w-360 px-5 md:px-10 lg:px-16">
        <div className="text-center">
          <SectionLabel>{dict.label}</SectionLabel>
          <h2 className="display mx-auto mt-4 max-w-3xl text-4xl font-semibold lg:text-6xl">
            {dict.heading1}
            <br />
            <span className="text-muted-foreground">{dict.heading2}</span>
          </h2>
        </div>

        <div className="mt-14 grid gap-4 lg:grid-cols-3">
          {dict.plans.map((plan, i) => (
            <PlanCard
              key={planLayout[i].name}
              name={planLayout[i].name}
              price={planLayout[i].price}
              primary={planLayout[i].primary}
              period={plan.period}
              desc={plan.desc}
              features={plan.features}
              cta={plan.cta}
              href={planLayout[i].href}
              badge={planLayout[i].primary ? dict.recommendedBadge : undefined}
            />
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">{dict.footnote}</p>
      </div>
    </section>
  );
}

function PlanCard({
  name,
  price,
  period,
  desc,
  features,
  cta,
  href,
  primary,
  badge,
}: {
  name: string;
  price: string;
  period: string;
  desc: string;
  features: string[];
  cta: string;
  href: string;
  primary?: boolean;
  badge?: string;
}) {
  return (
    <div
      className={`relative flex flex-col rounded-3xl border p-8 ${
        primary
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-background"
      }`}
    >
      {badge && (
        <span className="absolute -top-3 left-8 rounded-full bg-accent px-3 py-1 text-[11px] font-medium text-background">
          {badge}
        </span>
      )}

      <div
        className={`text-xs font-medium uppercase tracking-[0.18em] ${
          primary ? "text-background/60" : "text-muted-foreground"
        }`}
      >
        {name}
      </div>
      <div className="mt-6 flex items-baseline gap-2">
        <span className="display text-4xl font-semibold lg:text-5xl">{price}</span>
        <span
          className={`text-sm ${
            primary ? "text-background/60" : "text-muted-foreground"
          }`}
        >
          / {period}
        </span>
      </div>
      <p
        className={`mt-3 text-sm ${
          primary ? "text-background/70" : "text-muted-foreground"
        }`}
      >
        {desc}
      </p>

      <ul className="mt-8 space-y-3">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-3 text-sm">
            <Check
              className={`mt-0.5 size-4 shrink-0 ${
                primary ? "text-accent" : "text-accent-ink"
              }`}
              strokeWidth={2.5}
            />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <a
        href={href}
        className={`mt-10 block w-full rounded-full px-6 py-3 text-center text-sm font-medium transition-colors ${
          primary
            ? "bg-background text-foreground hover:bg-background/90"
            : "border border-border bg-background text-foreground hover:bg-muted"
        }`}
      >
        {cta}
      </a>
    </div>
  );
}
