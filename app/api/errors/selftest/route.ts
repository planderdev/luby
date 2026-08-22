/** 오류 모니터링 자가 점검 — 웹훅 시크릿을 아는 운영팀만 호출. 일부러 예외를 던져 instrumentation.onRequestError 경로를 검증한다. */
export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get("key");
  if (!key || key !== process.env.NOTIFICATION_WEBHOOK_SECRET) return new Response("unauthorized", { status: 401 });
  throw new Error(`[selftest] error monitoring check ${new Date().toISOString()}`);
}
