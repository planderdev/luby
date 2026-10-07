import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";
import { SignupForm } from "./SignupForm";
import { OAuthButtons } from "@/components/OAuthButtons";
import { enabledProviders } from "@/lib/auth-providers";
import { createClient } from "@/lib/supabase/server";
import { getAppLocale } from "@/lib/i18n/app-locale";
import { withLang } from "@/lib/i18n/app-locale-shared";
import { authDict } from "@/lib/i18n/app/auth";

type Params = { role?: string; redirect?: string; ref?: string; lang?: string };

export async function generateMetadata({ searchParams }: { searchParams: Promise<Params> }): Promise<Metadata> {
  const { lang } = await searchParams;
  const locale = await getAppLocale({ param: lang });
  const t = authDict[locale].signup;
  return {
    title: locale === "ko" ? t.metaTitle : { absolute: `${t.metaTitle} — Luby AI` },
    description: t.metaDesc,
    alternates: { canonical: "/signup" },
    openGraph: { title: `${t.metaTitle} — Luby AI`, description: t.ogDesc, url: "/signup" },
  };
}

export default async function SignupPage({ searchParams }: { searchParams: Promise<Params> }) {
  const { role, redirect: redirectTo, ref, lang } = await searchParams;
  const locale = await getAppLocale({ param: lang });
  const t = authDict[locale].signup;
  const initialRole = role === "advertiser" || role === "influencer" ? role : null;
  const safeRedirect = redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//") ? redirectTo : null;
  const safeRef = ref && /^[0-9a-f-]{36}$/.test(ref) ? ref : null;

  const supabase = await createClient();
  const [{ data: regions }, { data: channelTypes }, { data: categories }] = await Promise.all([
    supabase.from("regions").select("id, code, name, flag").eq("active", true).order("sort_order"),
    supabase.from("channel_types").select("id, slug, name").eq("active", true).order("sort_order"),
    supabase.from("categories").select("id, slug, name, emoji").eq("active", true).order("sort_order"),
  ]);

  return (
    <AuthShell title={t.title} subtitle={t.subtitle} locale={locale} pathname="/signup" query={{ role, redirect: redirectTo, ref }}>
      {enabledProviders().length > 0 && (
        <div className="mb-6">
          <OAuthButtons providers={enabledProviders()} next={safeRedirect ?? "/dashboard"} role={initialRole} refId={safeRef} label={authDict[locale].oauth.quick} locale={locale} />
        </div>
      )}
      <SignupForm
        regions={regions ?? []}
        channelTypes={channelTypes ?? []}
        categories={categories ?? []}
        initialRole={initialRole}
        redirectTo={safeRedirect}
        refId={safeRef}
        locale={locale}
      />
      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t.haveAccount}{" "}
        <Link href={withLang(safeRedirect ? `/login?redirect=${encodeURIComponent(safeRedirect)}` : "/login", locale)} className="font-medium text-foreground hover:text-accent-ink">
          {t.login}
        </Link>
      </p>
    </AuthShell>
  );
}
