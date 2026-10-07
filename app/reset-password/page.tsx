import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/AuthShell";
import { ResetForm } from "./ResetForm";
import { getAppLocale } from "@/lib/i18n/app-locale";
import { authDict } from "@/lib/i18n/app/auth";

type Params = { lang?: string };

export async function generateMetadata({ searchParams }: { searchParams: Promise<Params> }): Promise<Metadata> {
  const { lang } = await searchParams;
  const locale = await getAppLocale({ param: lang });
  const t = authDict[locale].reset;
  return { title: locale === "ko" ? t.metaTitle : { absolute: `${t.metaTitle} — Luby AI` }, description: t.metaDesc, alternates: { canonical: "/reset-password" }, robots: { index: false, follow: false } };
}

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<Params> }) {
  const { lang } = await searchParams;
  const locale = await getAppLocale({ param: lang });
  const t = authDict[locale].reset;
  return (
    <AuthShell title={t.title} subtitle={t.subtitle} locale={locale} pathname="/reset-password">
      <Suspense fallback={<div className="h-72" />}>
        <ResetForm locale={locale} />
      </Suspense>
    </AuthShell>
  );
}
