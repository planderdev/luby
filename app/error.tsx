"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCcw, ArrowLeft } from "lucide-react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
    void fetch("/api/errors/client", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: error.message, stack: error.stack?.slice(0, 4000), digest: error.digest, path: location.pathname + location.search }),
      keepalive: true,
    }).catch(() => {});
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-6 py-16 text-center">
      <p className="text-xs uppercase tracking-[0.24em] text-danger">문제가 발생했어요</p>
      <h1 className="display mt-4 text-3xl font-semibold lg:text-5xl">잠시 후 다시 시도해 주세요</h1>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground lg:text-base">
        일시적인 오류일 수 있어요. 다시 시도해도 반복되면 아래 이메일로 알려주세요.
        {error.digest && <span className="mt-2 block font-mono text-xs opacity-60">오류 코드 {error.digest}</span>}
      </p>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background"
        >
          <RotateCcw className="size-4" /> 다시 시도
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-3 text-sm font-medium hover:bg-muted"
        >
          <ArrowLeft className="size-4" /> 홈으로
        </Link>
      </div>
      <p className="mt-16 text-xs text-muted-foreground">
        <a href="mailto:contact@plander.io" className="underline underline-offset-2">contact@plander.io</a>
      </p>
    </main>
  );
}
