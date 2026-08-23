"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleHelp } from "lucide-react";
import { guideHrefFor } from "@/lib/docs/guide-map";

/** 현재 화면·역할에 맞는 가이드 페이지로 가는 ? 버튼 (새 탭) */
export function GuideButton({ role }: { role: string }) {
  const pathname = usePathname();
  const href = guideHrefFor(pathname, role);
  return (
    <Link href={href} target="_blank" rel="noopener" title="이 화면 가이드 보기" aria-label="이 화면 가이드 보기" className="inline-flex size-9 items-center justify-center rounded-full border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground">
      <CircleHelp className="size-4" />
    </Link>
  );
}
