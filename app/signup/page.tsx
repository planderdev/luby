import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";
import { SignupForm } from "./SignupForm";
import { OAuthButtons } from "@/components/OAuthButtons";
import { enabledProviders } from "@/lib/auth-providers";
import "../lre-auth.css";
import "../lre-auth-fix.css";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "회원가입",
  description:
    "루비AI 무료로 시작하기. 광고주는 캠페인 등록, 인플루언서는 채널 등록 후 응모 가능.",
  alternates: { canonical: "/signup" },
  openGraph: {
    title: "회원가입 — 루비AI",
    description: "30초 만에 가입하고 글로벌 체험단 마케팅을 시작하세요.",
    url: "/signup",
  },
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; redirect?: string; ref?: string }>;
}) {
  const { role, redirect: redirectTo, ref } = await searchParams;
  const initialRole =
    role === "advertiser" || role === "influencer" ? role : null;

  const supabase = await createClient();

  const [{ data: regions }, { data: channelTypes }, { data: categories }] = await Promise.all([
    supabase.from("regions").select("id, code, name, flag").eq("active", true).order("sort_order"),
    supabase
      .from("channel_types")
      .select("id, slug, name")
      .eq("active", true)
      .order("sort_order"),
    supabase.from("categories").select("id, name, emoji").eq("active", true).order("sort_order"),
  ]);

  return (
    <AuthShell eyebrow="Join" title="루비AI에 합류하세요" subtitle="역할을 선택하고 30초 안에 가입을 마쳐요.">
      {enabledProviders().length > 0 && (
        <div className="mb-6">
          <OAuthButtons
            providers={enabledProviders()}
            next={redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//") ? redirectTo : "/dashboard"}
            role={initialRole}
            refId={ref && /^[0-9a-f-]{36}$/.test(ref) ? ref : null}
            label="소셜 계정으로 빠르게"
          />
        </div>
      )}
      <SignupForm
        regions={regions ?? []}
        channelTypes={channelTypes ?? []}
        categories={categories ?? []}
        initialRole={initialRole}
        redirectTo={redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//") ? redirectTo : null}
        refId={ref && /^[0-9a-f-]{36}$/.test(ref) ? ref : null}
      />
      <p className="mt-6 text-center text-sm text-muted-foreground">
        이미 계정이 있으신가요?{" "}
        <Link href="/login" className="font-medium text-foreground hover:text-accent-ink">
          로그인
        </Link>
      </p>
    </AuthShell>
  );
}
