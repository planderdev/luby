"use client";

import Link from "next/link";
import { useViewer } from "./viewer";

/** 공개 페이지 상단 우측 — 비로그인은 로그인, 로그인 상태면 대시보드. 확인 전에는 로그인(다수 케이스)로 보여준다. */
export function TopBarAuthLink({ loginHref, loginLabel, dashboardLabel, className, trailing }: { loginHref: string; loginLabel: string; dashboardLabel: string; className?: string; trailing?: React.ReactNode }) {
  const { viewer } = useViewer();
  const cls = className ?? "text-xs font-medium text-muted-foreground hover:text-foreground";
  return viewer ? (
    <Link href="/dashboard" className={cls}>{dashboardLabel}{trailing}</Link>
  ) : (
    <Link href={loginHref} className={cls}>{loginLabel}{trailing}</Link>
  );
}
