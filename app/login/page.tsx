import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";
import { LoginForm } from "./LoginForm";
import { OAuthButtons } from "@/components/OAuthButtons";
import { enabledProviders } from "@/lib/auth-providers";

export const metadata: Metadata = {
  title: "로그인",
  description: "루비AI 광고주·인플루언서·운영자 로그인.",
  alternates: { canonical: "/login" },
  openGraph: {
    title: "로그인 — 루비AI",
    description: "루비AI 광고주·인플루언서·운영자 로그인.",
    url: "/login",
  },
};

import { authErrorFromParam } from "@/lib/auth-errors";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ redirect?: string; error?: string }> }) {
  const { redirect: redirectTo, error: errorKey } = await searchParams;
  const error = authErrorFromParam(errorKey);
  const providers = enabledProviders();
  const next = redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//") ? redirectTo : "/dashboard";
  return (
    <AuthShell title="다시 만나서 반가워요" subtitle={providers.length ? "이메일 또는 소셜 계정으로 로그인하세요." : "이메일과 비밀번호로 로그인하세요."}>
      {error && (
        <div className="mb-4 rounded-2xl border border-accent/30 bg-accent-soft px-4 py-3 text-sm text-accent-ink">{error}</div>
      )}
      <Suspense fallback={<div className="h-72" />}>
        <LoginForm />
      </Suspense>
      {providers.length > 0 && (
        <div className="mt-5">
          <OAuthButtons providers={providers} next={next} />
        </div>
      )}
      <p className="mt-6 text-center text-sm text-muted-foreground">
        아직 계정이 없으신가요?{" "}
        <Link href="/signup" className="font-medium text-foreground hover:text-accent-ink">
          회원가입
        </Link>
      </p>
      <p className="mt-2 text-center text-sm text-muted-foreground">
        비밀번호를 잊으셨나요?{" "}
        <Link href="/forgot-password" className="font-medium text-foreground hover:text-accent-ink">
          비밀번호 재설정
        </Link>
      </p>
    </AuthShell>
  );
}
