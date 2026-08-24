import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logError } from "@/lib/error-log";
import { isBotUa } from "@/lib/view-beacon";

/**
 * 클라이언트 오류 보고 — 에러 바운더리·전역 리스너가 호출.
 * 비로그인(공개 페이지)도 허용: 봇 UA 제외, 크기 제한, 같은 지문은 error-log 쪽에서 묶임.
 */
export async function POST(req: Request) {
  const ua = req.headers.get("user-agent");
  if (isBotUa(ua)) return new NextResponse(null, { status: 204 });
  const body = (await req.json().catch(() => null)) as { message?: string; stack?: string; digest?: string; path?: string } | null;
  if (!body?.message || typeof body.message !== "string") return NextResponse.json({ ok: false }, { status: 400 });
  let userId: string | null = null;
  try {
    const supabase = await createClient();
    userId = (await supabase.auth.getUser()).data.user?.id ?? null;
  } catch {
    /* 비로그인 */
  }
  await logError({
    source: "client",
    message: body.message.slice(0, 1000),
    stack: body.stack ? String(body.stack).slice(0, 4000) : null,
    digest: body.digest ?? null,
    path: typeof body.path === "string" ? body.path.slice(0, 200) : null,
    userId,
    userAgent: ua,
  });
  return NextResponse.json({ ok: true });
}
