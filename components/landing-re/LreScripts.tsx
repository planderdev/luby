"use client";

import { useEffect } from "react";

// 시안 footer.php 의 로드 순서 그대로 — gsap → ScrollTrigger → lenis → lucide → 시안 번들.
// 2026-10-12: jsDelivr 대신 사이트 직접 호스팅(/vendor, npm 원본과 해시 동일). 중국 본토에서 jsDelivr 가 막혀
// 체인이 멈추면 번들이 실행되지 않아 히어로 문구·섹션 제목이 숨은 채 남았다(scripts/.local/diag-cn-reveal.mjs).
const VENDOR = [
  "/vendor/gsap@3.15.0/gsap.min.js",
  "/vendor/gsap@3.15.0/ScrollTrigger.min.js",
  "/vendor/lenis@1.3.26/lenis.min.js",
  "/vendor/lucide@1.38.0/lucide.min.js",
];
/** 한 파일이 이 시간 안에 오지 않으면 실패로 보고 다음으로 넘어간다 */
const STEP_TIMEOUT_MS = 8000;

/**
 * 연출 스크립트를 못 돌릴 때의 정적 상태 — 시안의 '움직임 줄이기' 경로를 그대로 쓴다:
 * html.no-motion 이 등장 요소(.motion-*·split/type char)를 모두 보이게 하고, 히어로는 첫 문구를 고정 표시(is-reduced).
 */
function staticFallback() {
  document.documentElement.classList.add("no-motion", "lre-static");
  document.querySelectorAll(".luby-hero-story").forEach((el) => el.classList.add("is-reduced"));
}

/** 순서 보장이 필요해 next/script 대신 onload 체인으로 하나씩 붙인다. 실패·시간 초과는 건너뛰고, 라이브러리가 하나라도 없으면 정적 상태를 건 뒤 번들을 돌린다 */
export function LreScripts({ bundle }: { bundle: string }) {
  useEffect(() => {
    const scripts = [...VENDOR, bundle];
    let cancelled = false;
    let failed = false;
    const load = (i: number) => {
      if (cancelled || i >= scripts.length) return;
      const src = scripts[i];
      const isBundle = i === scripts.length - 1;
      if (isBundle && failed) {
        // 정적 상태를 먼저 건 뒤 번들은 그대로 돌린다 — 번들은 gsap 이 없으면 스스로 '움직임 줄이기' 경로로 가고,
        // 모바일 메뉴 같은 기본 동작은 번들에 있으므로 건너뛰면 메뉴가 열리지 않는다
        staticFallback();
      }
      if (document.querySelector(`script[src="${src}"]`)) {
        load(i + 1);
        return;
      }
      const el = document.createElement("script");
      el.src = src;
      let settled = false;
      const next = (ok: boolean) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (!ok) {
          failed = true;
          if (isBundle) staticFallback();
        }
        load(i + 1);
      };
      const timer = setTimeout(() => next(false), STEP_TIMEOUT_MS);
      el.onload = () => next(true);
      el.onerror = () => next(false);
      document.body.appendChild(el);
    };
    load(0);
    return () => {
      cancelled = true;
    };
  }, [bundle]);
  return null;
}
