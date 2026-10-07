import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";
import { LoginForm } from "./LoginForm";
import { OAuthButtons } from "@/components/OAuthButtons";
import { enabledProviders } from "@/lib/auth-providers";
import { authErrorFromParam } from "@/lib/auth-errors";
import { getAppLocale } from "@/lib/i18n/app-locale";
import { withLang } from "@/lib/i18n/app-locale-shared";
import { authDict } from "@/lib/i18n/app/auth";

type Params = { redirect?: string; error?: string; verified?: string; lang?: string };

export async function generateMetadata({ searchParams }: { searchParams: Promise<Params> }): Promise<Metadata> {
  const { lang } = await searchParams;
  const locale = await getAppLocale({ param: lang });
  const t = authDict[locale].login;
  return {
    title: locale === "ko" ? t.metaTitle : { absolute: `${t.metaTitle} — Luby AI` },
    description: t.metaDesc,
    alternates: { canonical: "/login" },
    openGraph: { title: `${t.metaTitle} — Luby AI`, description: t.metaDesc, url: "/login" },
  };
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<Params> }) {
  const { redirect: redirectTo, error: errorKey, verified, lang } = await searchParams;
  const locale = await getAppLocale({ param: lang });
  const t = authDict[locale].login;
  const error = authErrorFromParam(errorKey, locale);
  const providers = enabledProviders();
  const next = redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//") ? redirectTo : "/dashboard";
  return (
    <AuthShell title={t.title} subtitle={providers.length ? t.subtitleSocial : t.subtitleEmail} locale={locale} pathname="/login" query={{ redirect: redirectTo, verified }}>
      {verified === "1" && !error && (
        <div className="mb-4 rounded-2xl border border-accent/30 bg-accent-soft px-4 py-3 text-sm text-accent-ink">{t.verified}</div>
      )}
      {error && (
        <div className="mb-4 rounded-2xl border border-accent/30 bg-accent-soft px-4 py-3 text-sm text-accent-ink">{error}</div>
      )}
      <Suspense fallback={<div className="h-72" />}>
        <LoginForm locale={locale} />
      </Suspense>
      {providers.length > 0 && (
        <div className="mt-5">
          <OAuthButtons providers={providers} next={next} locale={locale} />
        </div>
      )}
      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t.noAccount}{" "}
        <Link href={withLang(redirectTo ? `/signup?redirect=${encodeURIComponent(next)}` : "/signup", locale)} className="font-medium text-foreground hover:text-accent-ink">
          {t.signup}
        </Link>
      </p>
      <p className="mt-2 text-center text-sm text-muted-foreground">
        {t.forgotQ}{" "}
        <Link href={withLang("/forgot-password", locale)} className="font-medium text-foreground hover:text-accent-ink">
          {t.reset}
        </Link>
      </p>
    </AuthShell>
  );
}
