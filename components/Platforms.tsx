import { SectionLabel } from "./Features";
import type { ExtraDict } from "@/lib/i18n/landing-extra";

/**
 * 글로벌 플랫폼 커버리지 — 샤오홍슈(小红书) 하이라이트 + 지원 채널.
 * 글로벌 체험단의 차별점을 "채널" 관점에서 설명하는 섹션.
 */
export function Platforms({ dict }: { dict: ExtraDict["platforms"] }) {
  const f = dict.featured;
  return (
    <section id="platforms" className="border-t border-border py-28 lg:py-36">
      <div className="mx-auto w-full max-w-360 px-5 md:px-10 lg:px-16">
        <div className="max-w-2xl">
          <SectionLabel>{dict.label}</SectionLabel>
          <h2 className="display mt-4 text-4xl font-semibold lg:text-6xl">
            {dict.heading1}
            <br />
            <span className="pink-underline">{dict.heading2}</span>
          </h2>
          <p className="mt-6 text-base leading-relaxed text-muted-foreground">{dict.sub}</p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-[1.35fr_1fr]">
          {/* Featured: Xiaohongshu */}
          <article className="relative overflow-hidden rounded-3xl border border-accent/40 bg-background p-6 lg:p-8">
            <div className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-accent/10 blur-3xl" />
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-[#ff2442] text-sm font-black tracking-tight text-white">
                小红书
              </div>
              <div>
                <h3 className="text-lg font-semibold">{f.name}</h3>
                <span className="mt-0.5 inline-block rounded-full bg-accent-soft px-2.5 py-0.5 text-[11px] font-medium text-accent-ink">
                  {f.tag}
                </span>
              </div>
            </div>
            <p className="mt-5 max-w-xl text-sm leading-relaxed text-muted-foreground lg:text-base">{f.desc}</p>

            <div className="mt-6 grid grid-cols-3 gap-3">
              {f.stats.map((st) => (
                <div key={st.label} className="rounded-2xl bg-muted/50 px-4 py-3">
                  <div className="display text-2xl font-semibold lg:text-3xl">{st.value}</div>
                  <div className="mt-1 text-[11px] leading-snug text-muted-foreground">{st.label}</div>
                </div>
              ))}
            </div>

            <ul className="mt-6 space-y-3">
              {f.points.map((pt) => (
                <li key={pt} className="flex items-start gap-3 text-sm leading-relaxed">
                  <span className="mt-2 inline-block size-1.5 shrink-0 rounded-full bg-accent" />
                  <span>{pt}</span>
                </li>
              ))}
            </ul>
          </article>

          {/* Other channels */}
          <aside className="rounded-3xl border border-border bg-muted/40 p-6 lg:p-8">
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{dict.othersLabel}</div>
            <ul className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
              {dict.others.map((o) => (
                <li
                  key={o.name}
                  className="flex items-center justify-between rounded-2xl border border-border bg-background px-4 py-3 text-sm"
                >
                  <span className="font-medium">{o.name}</span>
                  <span className="text-xs text-muted-foreground">{o.region}</span>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-[11px] leading-relaxed text-muted-foreground">{dict.footnote}</p>
          </aside>
        </div>
      </div>
    </section>
  );
}
