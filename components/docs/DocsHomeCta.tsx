"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useViewer } from "@/components/public/viewer";

/** 가이드 홈 첫 CTA — 손님은 가입, 로그인 상태면 대시보드 (서버 쿠키 읽기를 피해 클라이언트에서 판단) */
export function DocsHomeCta({ startLabel, dashLabel }: { startLabel: string; dashLabel: string }) {
  const { viewer } = useViewer();
  return (
    <Link href={viewer ? "/dashboard" : "/signup"} className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background">
      {viewer ? dashLabel : startLabel} <ArrowRight className="size-4" />
    </Link>
  );
}
