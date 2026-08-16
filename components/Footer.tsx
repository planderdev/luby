import Image from "next/image";
import { LangSwitcher } from "./LangSwitcher";
import type { Dict, Locale } from "@/lib/i18n";
import { businessInfo } from "@/lib/legal/content";

export function Footer({ dict, locale }: { dict: Dict["footer"]; locale: Locale }) {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto w-full max-w-360 px-5 py-16 md:px-10 lg:px-16">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_2fr] lg:gap-20">
          <div>
            <Image
              src="/logo.png"
              alt="Luby AI"
              width={1298}
              height={410}
              className="h-8 w-auto invert dark:invert-0"
            />
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-muted-foreground">
              {dict.tagline1}
              <br />
              {dict.tagline2}
            </p>

            <div className="mt-6 flex items-center gap-2">
              {["X", "IG", "DC", "in"].map((s) => (
                <a
                  key={s}
                  href="#"
                  className="flex size-9 items-center justify-center rounded-full border border-border text-xs font-medium transition-colors hover:bg-muted"
                >
                  {s}
                </a>
              ))}
            </div>

            <div className="mt-6">
              <LangSwitcher locale={locale} align="left" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {dict.columns.map((c) => (
              <div key={c.title}>
                <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  {c.title}
                </div>
                <ul className="mt-4 space-y-3">
                  {c.links.map((l) => (
                    <li key={l.label}>
                      <a
                        href={l.href}
                        className="inline-block py-1.5 text-sm text-foreground/80 transition-colors hover:text-foreground"
                      >
                        {l.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 border-t border-border pt-8 text-xs text-muted-foreground">
          <dl className="flex flex-wrap gap-x-4 gap-y-1.5">
            {businessInfo(locale).map((b) => (
              <div key={b.label} className="inline-flex gap-1.5">
                <dt className="text-muted-foreground/70">{b.label}</dt>
                <dd className="text-foreground/70">{b.value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-5 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>{dict.copyright}</div>
            <div>{dict.madeWith}</div>
          </div>
        </div>
      </div>
    </footer>
  );
}
