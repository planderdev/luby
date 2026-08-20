"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCw } from "lucide-react";

/** 대시보드 새로고침 아이콘 버튼 — 현재 화면의 서버 데이터를 다시 불러온다 */
export function RefreshButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => startTransition(() => router.refresh())}
      disabled={pending}
      aria-label="새로고침"
      title="새로고침"
      className="inline-flex size-10 items-center justify-center rounded-full border border-border bg-background transition-colors hover:bg-muted disabled:opacity-60"
    >
      <RotateCw className={`size-4.5 ${pending ? "animate-spin" : ""}`} />
    </button>
  );
}
