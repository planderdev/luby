import Link from "next/link";
import Image from "next/image";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LangSwitcher } from "@/components/LangSwitcher";
import { LangSync } from "@/components/LangSync";
import { authDict } from "@/lib/i18n/app/auth";
import type { Locale } from "@/lib/i18n/config";

/**
 * 인증 화면 2단 셸(폼 + 비주얼). 2026-10-07 부터 ko/en/zh — locale 을 주면 셸 문구·언어 전환 핀이 그 언어로,
 * LangSync 가 쿠키(luby_lang)·<html lang> 을 맞춘다. pathname/query 는 언어 전환 링크가 현재 주소를 유지하기 위한 것.
 */
export function AuthShell({
  children,
  title,
  subtitle,
  locale = "ko",
  pathname = "/",
  query,
}: {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  locale?: Locale;
  pathname?: string;
  query?: Record<string, string | undefined>;
}) {
  const t = authDict[locale].shell;
  return (
    <main className="relative flex min-h-dvh" lang={locale === "zh" ? "zh-CN" : locale}>
      <LangSync locale={locale} />
      {/* left: form */}
      <section className="flex flex-1 flex-col px-6 py-10 md:px-16 lg:px-24">
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center" aria-label={t.homeAria}>
            <Image
              src="/logo.png"
              alt={t.logoAlt}
              width={1298}
              height={410}
              className="h-7 w-auto invert dark:invert-0"
            />
          </Link>
          <div className="flex items-center gap-2">
            <LangSwitcher locale={locale} pathname={pathname} query={query} />
            <ThemeToggle />
          </div>
        </div>

        <div className="my-auto w-full max-w-md py-12">
          <h1 className="display text-3xl font-semibold lg:text-4xl">{title}</h1>
          <p className="mt-3 text-sm text-muted-foreground lg:text-base">{subtitle}</p>
          <div className="mt-10">{children}</div>
        </div>

        <p className="text-xs text-muted-foreground">
          {t.copyright} · <Link href="/" className="hover:text-foreground">{t.home}</Link>
        </p>
      </section>

      {/* right: visual (hidden on mobile) */}
      <aside className="relative hidden flex-1 overflow-hidden bg-foreground text-background lg:block">
        <div aria-hidden className="bg-grid absolute inset-0 opacity-[0.07]" />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-40 top-1/3 size-[640px] rounded-full opacity-50 blur-3xl"
          style={{ background: "radial-gradient(closest-side, rgb(236 72 153 / 0.5), transparent)" }}
        />
        <div className="relative flex h-full flex-col justify-end p-16">
          <div className="text-xs uppercase tracking-[0.2em] text-background/60">{t.eyebrow}</div>
          <p className="display mt-4 max-w-md whitespace-pre-line break-keep text-3xl font-semibold leading-[1.2] lg:text-4xl" style={{ textWrap: "balance" }}>
            {t.heroTitle}
          </p>
          <p className="mt-4 max-w-sm break-keep text-sm text-background/70">{t.heroDesc}</p>
        </div>
      </aside>
    </main>
  );
}
