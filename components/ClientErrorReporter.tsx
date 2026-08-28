"use client";

import { useEffect } from "react";

/**
 * 전역 클라이언트 오류 리스너 — 에러 바운더리에 안 잡히는 예외(이벤트 핸들러·비동기·프라미스 거부)를
 * /api/errors/client 로 보고. 세션당 같은 메시지 1회, 최대 5건. 무해한 브라우저 노이즈는 제외.
 */
const IGNORE = /ResizeObserver loop|Script error\.?$|Load failed|NetworkError|AbortError|The operation was aborted|ChunkLoadError.*importScripts|Failed to fetch dynamically imported module.*(safari|chrome)-extension/i;

export function ClientErrorReporter() {
  useEffect(() => {
    const sent = new Set<string>();
    let count = 0;
    const report = (message: string, stack?: string | null) => {
      if (!message || IGNORE.test(message) || count >= 5) return;
      // 방문자의 브라우저 확장 프로그램에서 난 오류는 우리 코드가 아니다 (예: chrome-extension://…/executors/200.js)
      if (stack && /(chrome|safari|moz)-extension:\/\//.test(stack)) return;
      const key = message.slice(0, 120);
      if (sent.has(key)) return;
      sent.add(key);
      count += 1;
      try {
        void fetch("/api/errors/client", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ message: message.slice(0, 1000), stack: stack?.slice(0, 4000), path: location.pathname + location.search }),
          keepalive: true,
        }).catch(() => {});
      } catch {
        /* ignore */
      }
    };
    const onError = (e: ErrorEvent) => {
      // 외부 스크립트(광고 등) cross-origin 오류는 메시지가 'Script error' 로만 와서 IGNORE 처리됨
      report(e.message || String(e.error ?? ""), e.error instanceof Error ? e.error.stack : `${e.filename}:${e.lineno}:${e.colno}`);
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      const r = e.reason;
      report(r instanceof Error ? `unhandledrejection: ${r.message}` : `unhandledrejection: ${String(r).slice(0, 300)}`, r instanceof Error ? r.stack : null);
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  return null;
}
