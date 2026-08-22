"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

/** 현재 URL 의 ?ref= 를 가입 링크에 전파 (정적 페이지에서 추천 코드 유지) */
export function RefAwareLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  const [h, setH] = useState(href);
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref && /^[0-9a-f-]{36}$/.test(ref) && href.startsWith("/signup")) setH(`${href}&ref=${ref}`);
  }, [href]);
  return <Link href={h} className={className}>{children}</Link>;
}
