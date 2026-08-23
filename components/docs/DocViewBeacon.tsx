"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** 가이드 페이지 조회 비콘 — 경로당 세션 1회 */
export function DocViewBeacon({ lang }: { lang: string }) {
  const pathname = usePathname();
  useEffect(() => {
    const key = `luby:docview:${pathname}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch { /* private mode */ }
    fetch("/api/docs/view", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ path: pathname, lang }), keepalive: true }).catch(() => {});
  }, [pathname, lang]);
  return null;
}
