import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { AuthShell } from "@/components/AuthShell";
import { OnboardingForm } from "./OnboardingForm";
import { getAppLocale } from "@/lib/i18n/app-locale";
import { authDict } from "@/lib/i18n/app/auth";

type Params = { next?: string; role?: string; ref?: string; lang?: string };

export async function generateMetadata({ searchParams }: { searchParams: Promise<Params> }): Promise<Metadata> {
  const { lang } = await searchParams;
  const locale = await getAppLocale({ param: lang });
  const t = authDict[locale].onboarding.metaTitle;
  return { title: locale === "ko" ? t : { absolute: `${t} — Luby AI` } };
}

/** 소셜 로그인 가입자의 역할 확정 페이지 (onboarding_done=false 일 때만) */
export default async function OnboardingPage({ searchParams }: { searchParams: Promise<Params> }) {
  const { next, role, ref, lang } = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  const supabase = await createClient();
  const { data: p } = await supabase.from("profiles").select("onboarding_done, locale").eq("id", profile.id).maybeSingle();
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  if (p?.onboarding_done !== false) redirect(safeNext);
  const locale = await getAppLocale({ param: lang, profileLocale: p?.locale });
  const t = authDict[locale].onboarding;

  const { data: regions } = await supabase.from("regions").select("id, code, name, flag").eq("active", true).order("sort_order");

  return (
    <AuthShell title={t.title} subtitle={t.subtitle} locale={locale} pathname="/onboarding" query={{ next, role, ref }}>
      <OnboardingForm
        initialRole={role === "advertiser" || role === "influencer" ? role : null}
        defaultName={profile.name}
        regions={regions ?? []}
        next={safeNext}
        refId={ref && /^[0-9a-f-]{36}$/.test(ref) ? ref : null}
        locale={locale}
      />
    </AuthShell>
  );
}
