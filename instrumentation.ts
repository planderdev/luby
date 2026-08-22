import type { Instrumentation } from "next";

/**
 * Next 15 서버 오류 훅 — 렌더/라우트/액션/미들웨어에서 잡히지 않은 예외를 server_errors 에 기록.
 * (Node 런타임에서만 DB 기록; Edge 는 콘솔만)
 */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const e = err as Error & { digest?: string };
  const { logError } = await import("@/lib/error-log");
  await logError({
    source: "server",
    message: e?.message ?? String(err),
    stack: e?.stack ?? null,
    digest: e?.digest ?? null,
    path: request.path.split("?")[0], // 쿼리스트링 제거 (토큰·키 노출 방지)
    method: request.method,
    routeType: context.routeType,
    userAgent: request.headers["user-agent"] as string | undefined,
  });
};
