import { SectionLabel } from "./Features";
import type { Dict } from "@/lib/i18n";

const markets = [
  { region: "Korea", flag: "🇰🇷", channels: "2,400+", main: true },
  { region: "Japan", flag: "🇯🇵", channels: "1,820+" },
  { region: "USA", flag: "🇺🇸", channels: "980+" },
  { region: "Taiwan", flag: "🇹🇼", channels: "740+" },
  { region: "Thailand", flag: "🇹🇭", channels: "1,150+" },
  { region: "Vietnam", flag: "🇻🇳", channels: "920+" },
  { region: "Indonesia", flag: "🇮🇩", channels: "1,080+" },
  { region: "Philippines", flag: "🇵🇭", channels: "510+" },
  { region: "Singapore", flag: "🇸🇬", channels: "320+" },
  { region: "Malaysia", flag: "🇲🇾", channels: "440+" },
  { region: "Hong Kong", flag: "🇭🇰", channels: "280+" },
  { region: "China", flag: "🇨🇳", channels: "640+" },
];

export function Global({ dict }: { dict: Dict["global"] }) {
  return (
    <section id="global" className="py-28 lg:py-36">
      <div className="mx-auto w-full max-w-360 px-5 md:px-10 lg:px-16">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
          <div>
            <SectionLabel>{dict.label}</SectionLabel>
            <h2 className="display mt-4 text-4xl font-semibold lg:text-6xl">
              {dict.headingLine1}
              <br />
              <span className="pink-underline">{dict.headingHighlight}</span>
              {dict.headingSuffix}
            </h2>
            <p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground">
              {dict.paragraph}
            </p>

            <ul className="mt-8 space-y-3">
              {dict.bullets.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm">
                  <span className="mt-1.5 inline-block size-1.5 shrink-0 rounded-full bg-accent" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative rounded-3xl border border-border bg-muted/40 p-6 lg:p-8">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {markets.map((m) => (
                <div
                  key={m.region}
                  className={`group relative flex flex-col rounded-2xl border p-4 transition-colors ${
                    m.main
                      ? "border-accent bg-background"
                      : "border-border bg-background hover:bg-accent-soft"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{m.flag}</span>
                    {m.main && (
                      <span className="rounded-full bg-accent-strong px-2 py-0.5 text-[10px] font-medium text-background">
                        HQ
                      </span>
                    )}
                  </div>
                  <div className="mt-4 text-sm font-medium">{m.region}</div>
                  <div className="text-xs text-muted-foreground">
                    {m.channels} {dict.channelsLabel}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-between rounded-2xl bg-background px-5 py-4">
              <div>
                <div className="text-xs text-muted-foreground">{dict.totalLabel}</div>
                <div className="display mt-1 text-2xl font-semibold">11,280+</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">{dict.newMarketLabel}</div>
                <div className="mt-1 text-sm font-medium">🇮🇳 India · 🇦🇺 AU · 🇲🇽 MX</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
