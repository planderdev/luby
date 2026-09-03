import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";
import { ForgotForm } from "./ForgotForm";
import "../lre-auth.css";
import "../lre-auth-fix.css";

export const metadata: Metadata = {
  title: "비밀번호 재설정",
  description: "루비AI 계정 비밀번호를 재설정합니다.",
  alternates: { canonical: "/forgot-password" },
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      eyebrow="Reset"
      title="비밀번호를 잊으셨나요?"
      subtitle="가입한 이메일로 재설정 링크를 보내드릴게요."
    >
      <ForgotForm />
      <p className="mt-6 text-center text-sm text-muted-foreground">
        비밀번호가 기억나셨나요?{" "}
        <Link href="/login" className="font-medium text-foreground hover:text-accent-ink">
          로그인
        </Link>
      </p>
    </AuthShell>
  );
}
