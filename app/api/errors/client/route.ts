import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logError } from "@/lib/error-log";

/** 클라이언트 에러 경계가 보고하는 엔드포인트 — 로그인 사용자만 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { message?: string; stack?: string; digest?: string; path?: string } | null;
  if (!body?.message) return NextResponse.json({ ok: false }, { status: 400 });
  await logError({
    source: "client",
    message: String(body.message).slice(0, 1000),
    stack: body.stack ? String(body.stack).slice(0, 4000) : null,
    digest: body.digest ?? null,
    path: body.path ?? null,
    userId: user.id,
    userAgent: req.headers.get("user-agent"),
  });
  return NextResponse.json({ ok: true });
}
