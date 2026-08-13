import type { Dict } from "@/lib/i18n";

const flags = ["🇰🇷", "🇯🇵", "🇺🇸", "🇹🇼", "🇹🇭", "🇻🇳", "🇮🇩", "🇵🇭", "🇸🇬", "🇲🇾", "🇭🇰", "🇨🇳"];

export function SocialProof({ dict }: { dict: Dict["socialProof"] }) {
  return (
    <section className="border-y border-border bg-muted/40 py-12">
      <div className="mx-auto w-full max-w-360 px-5 md:px-10 lg:px-16">
        <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto]">
          {/* stats */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-6 md:grid-cols-4">
            {dict.stats.map((s) => (
              <div key={s.label}>
                <div className="display text-3xl font-semibold lg:text-4xl">{s.value}</div>
                <div className="mt-1 text-xs text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>

          {/* flag marquee */}
          <div className="relative w-full overflow-hidden lg:w-[360px]">
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-muted/40 to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-muted/40 to-transparent" />
            <div className="flex w-max animate-marquee gap-3">
              {[...flags, ...flags].map((f, i) => (
                <span
                  key={i}
                  className="flex size-12 shrink-0 items-center justify-center rounded-2xl glass-card text-2xl"
                >
                  {f}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
