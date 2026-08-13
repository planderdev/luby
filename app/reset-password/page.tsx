import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/AuthShell";
import { ResetForm } from "./ResetForm";

export const metadata: Metadata = {
  title: "새 비밀번호 설정",
  description: "루비AI 계정의 새 비밀번호를 설정합니다.",
  alternates: { canonical: "/reset-password" },
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return (
    <AuthShell title="새 비밀번호 설정" subtitle="사용할 새 비밀번호를 입력해주세요.">
      <Suspense fallback={<div className="h-72" />}>
        <ResetForm />
      </Suspense>
    </AuthShell>
  );
}
