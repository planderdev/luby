"use client";

import { useEffect } from "react";

// 시안 footer.php 의 로드 순서 그대로 — gsap → ScrollTrigger → lenis → lucide → 시안 번들
const CDN = [
  "https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js",
  "https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/ScrollTrigger.min.js",
  "https://cdn.jsdelivr.net/npm/lenis@1.3.26/dist/lenis.min.js",
  "https://cdn.jsdelivr.net/npm/lucide@1.38.0/dist/umd/lucide.min.js",
];

/** 순서 보장이 필요해 next/script 대신 onload 체인으로 하나씩 붙인다 */
export function LreScripts({ bundle }: { bundle: string }) {
  useEffect(() => {
    const scripts = [...CDN, bundle];
    let cancelled = false;
    const load = (i: number) => {
      if (cancelled || i >= scripts.length) return;
      const src = scripts[i];
      if (document.querySelector(`script[src="${src}"]`)) {
        load(i + 1);
        return;
      }
      const el = document.createElement("script");
      el.src = src;
      el.onload = () => load(i + 1);
      document.body.appendChild(el);
    };
    load(0);
    return () => {
      cancelled = true;
    };
  }, [bundle]);
  return null;
}
