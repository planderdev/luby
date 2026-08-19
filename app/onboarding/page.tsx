import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { AuthShell } from "@/components/AuthShell";
import { OnboardingForm } from "./OnboardingForm";

export const metadata = { title: "시작하기 — 루비AI" };

/** 소셜 로그인 가입자의 역할 확정 페이지 (onboarding_done=false 일 때만) */
export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; role?: string; ref?: string }>;
}) {
  const { next, role, ref } = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  const supabase = await createClient();
  const { data: p } = await supabase.from("profiles").select("onboarding_done").eq("id", profile.id).maybeSingle();
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  if (p?.onboarding_done !== false) redirect(safeNext);

  const { data: regions } = await supabase.from("regions").select("id, name, flag").eq("active", true).order("sort_order");

  return (
    <AuthShell title="거의 다 됐어요" subtitle="어떤 역할로 루비AI를 사용할지 알려주세요. 30초면 끝나요.">
      <OnboardingForm
        initialRole={role === "advertiser" || role === "influencer" ? role : null}
        defaultName={profile.name}
        regions={regions ?? []}
        next={safeNext}
        refId={ref && /^[0-9a-f-]{36}$/.test(ref) ? ref : null}
      />
    </AuthShell>
  );
}
