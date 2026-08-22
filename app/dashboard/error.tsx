"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw, ArrowLeft } from "lucide-react";
import Link from "next/link";

/**
 * 대시보드 에러 바운더리 — 예상 못 한 예외 발생 시 Next.js 기본
 * "Application error" 화면 대신 브랜드 톤의 복구 UI를 보여준다.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 운영자 오류 모니터링으로 보고 (실패 무시)
    void fetch("/api/errors/client", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: error.message, stack: error.stack?.slice(0, 4000), digest: error.digest, path: location.pathname }),
    }).catch(() => {});
  }, [error]);
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <div className="mx-auto flex size-16 items-center justify-center rounded-3xl bg-accent-soft">
        <AlertTriangle className="size-8 text-accent-ink" />
      </div>
      <h1 className="display mt-6 text-3xl font-semibold">문제가 발생했어요</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        일시적인 오류일 수 있어요. 다시 시도해보시고, 계속되면 아래 정보와 함께
        문의해주세요.
      </p>
      {error.digest && (
        <p className="mt-2 font-mono text-xs text-muted-foreground">
          오류 코드: {error.digest}
        </p>
      )}
      <div className="mt-8 flex flex-col items-center justify-center gap-2 sm:flex-row">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background"
        >
          <RotateCcw className="size-4" />
          다시 시도
        </button>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-6 py-3 text-sm font-medium hover:bg-muted"
        >
          <ArrowLeft className="size-4" />
          대시보드로
        </Link>
      </div>
      <p className="mt-8 text-xs text-muted-foreground">
        문의:{" "}
        <a href="mailto:contact@plander.io" className="underline">
          contact@plander.io
        </a>
      </p>
    </div>
  );
}
