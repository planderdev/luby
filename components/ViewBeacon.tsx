"use client";

import { useEffect } from "react";

/**
 * 공개 캠페인 페이지 조회 비콘 — 마운트 시 1회 POST /api/c/view.
 * 유입원: ?src=qr|link|dir → 그대로, ?ref= 있으면 ref, 없으면 direct. 소유주·운영자 본인 조회는 skip.
 * 같은 탭 세션에서는 캠페인당 1회만 보낸다(서버도 30분 중복 제거).
 */
export function ViewBeacon({ campaignId, lang, skip = false }: { campaignId: string; lang: "ko" | "en" | "zh"; skip?: boolean }) {
  useEffect(() => {
    if (skip) return;
    const key = `luby:viewed:${campaignId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* private mode 등 */
    }
    const q = new URLSearchParams(window.location.search);
    const src = q.get("src");
    const source = src && ["qr", "link", "dir"].includes(src) ? src : q.get("ref") ? "ref" : "direct";
    fetch("/api/c/view", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: campaignId, source, lang }),
      keepalive: true,
    }).catch(() => {});
  }, [campaignId, lang, skip]);
  return null;
}
