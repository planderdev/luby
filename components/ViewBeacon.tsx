"use client";

import { useEffect } from "react";

/**
 * 공개 페이지 조회 비콘 — 마운트 시 1회 POST. 캠페인(/api/c/view) · 크리에이터 프로필(/api/p/view) 공용.
 * 유입원: ?src=qr|link|dir → 그대로, ?ref= 있으면 ref, 없으면 direct. 소유주·운영자 본인 조회는 skip.
 * 같은 탭 세션에서는 대상당 1회만 보낸다(서버도 30분 중복 제거).
 */
export function ViewBeacon({ kind = "campaign", id, lang, skip = false }: { kind?: "campaign" | "creator"; id: string; lang: "ko" | "en" | "zh"; skip?: boolean }) {
  useEffect(() => {
    if (skip) return;
    const key = `luby:viewed:${kind}:${id}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* private mode 등 */
    }
    const q = new URLSearchParams(window.location.search);
    const src = q.get("src");
    const source = src && ["qr", "link", "dir"].includes(src) ? src : q.get("ref") ? "ref" : "direct";
    fetch(kind === "creator" ? "/api/p/view" : "/api/c/view", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, source, lang }),
      keepalive: true,
    }).catch(() => {});
  }, [kind, id, lang, skip]);
  return null;
}
