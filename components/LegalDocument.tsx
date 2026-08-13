import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { legalContent } from "@/lib/legal/content";
import { locales, localeNames, type Locale } from "@/lib/i18n";

/**
 * 이용약관·개인정보처리방침 공통 렌더러.
 * `?lang=` 으로 3개 언어 전환, 한국어가 법적 정본.
 */
export function LegalDocument({
  doc,
  locale,
}: {
  doc: "terms" | "privacy";
  locale: Locale;
}) {
  const c = legalContent[locale];
  const d = c[doc];

  return (
    <main className="relative min-h-dvh bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between px-5 md:px-8">
          <Link href="/" className="flex items-center gap-2" aria-label="Ruby AI">
            <Image
              src="/logo.png"
              alt="Ruby AI"
              width={1298}
              height={410}
              className="h-6 w-auto invert dark:invert-0"
            />
          </Link>
          <div className="flex items-center gap-2">
            {/* Language toggle */}
            <div className="flex items-center rounded-full border border-border p-0.5">
              {locales.map((l) => (
                <Link
                  key={l}
                  href={`/${doc}?lang=${l}`}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                    l === locale
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {localeNames[l].code}
                </Link>
              ))}
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <article className="mx-auto w-full max-w-3xl px-5 py-14 md:px-8 lg:py-20">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          {c.backToHome}
        </Link>

        <h1 className="display mt-5 text-4xl font-semibold lg:text-5xl">{d.title}</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {d.effectiveLabel}: {d.effectiveDate}
        </p>

        {/* Disclaimer */}
        <p className="mt-6 rounded-2xl border border-border bg-muted/40 px-5 py-4 text-sm leading-relaxed text-muted-foreground">
          {d.disclaimer}
        </p>

        {/* Company / responsible party info */}
        <div className="mt-4 rounded-2xl glass-card px-5 py-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {d.companyLabel}
          </div>
          <dl className="mt-3 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
            {d.company.map((row) => (
              <div key={row.label} className="flex gap-2">
                <dt className="shrink-0 text-muted-foreground">{row.label}</dt>
                <dd className="min-w-0">{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Sections */}
        <div className="mt-10 space-y-9">
          {d.sections.map((s) => (
            <section key={s.heading} id={s.id} className="scroll-mt-24">
              <h2 className="text-lg font-semibold tracking-tight">{s.heading}</h2>
              <div className="mt-3 space-y-2">
                {s.body.map((p, i) => (
                  <p key={i} className="text-sm leading-relaxed text-muted-foreground">
                    {p}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Footer link */}
        <div className="mt-16 border-t border-border pt-8">
          <Link
            href={doc === "terms" ? `/privacy?lang=${locale}` : `/terms?lang=${locale}`}
            className="text-sm font-medium text-foreground/80 transition-colors hover:text-foreground"
          >
            {doc === "terms" ? c.privacy.title : c.terms.title} →
          </Link>
        </div>
      </article>
    </main>
  );
}
