import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";
import { ForgotForm } from "./ForgotForm";
import { getAppLocale } from "@/lib/i18n/app-locale";
import { withLang } from "@/lib/i18n/app-locale-shared";
import { authDict } from "@/lib/i18n/app/auth";

type Params = { lang?: string };

export async function generateMetadata({ searchParams }: { searchParams: Promise<Params> }): Promise<Metadata> {
  const { lang } = await searchParams;
  const locale = await getAppLocale({ param: lang });
  const t = authDict[locale].forgot;
  return { title: locale === "ko" ? t.metaTitle : { absolute: `${t.metaTitle} — Luby AI` }, description: t.metaDesc, alternates: { canonical: "/forgot-password" }, robots: { index: false, follow: false } };
}

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<Params> }) {
  const { lang } = await searchParams;
  const locale = await getAppLocale({ param: lang });
  const t = authDict[locale].forgot;
  return (
    <AuthShell title={t.title} subtitle={t.subtitle} locale={locale} pathname="/forgot-password">
      <ForgotForm locale={locale} />
      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t.rememberQ}{" "}
        <Link href={withLang("/login", locale)} className="font-medium text-foreground hover:text-accent-ink">
          {t.login}
        </Link>
      </p>
    </AuthShell>
  );
}
