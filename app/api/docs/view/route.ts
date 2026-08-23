import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { isBotUa, visitorHash } from "@/lib/view-beacon";

export const runtime = "nodejs";

/** 가이드 페이지 조회 비콘 — 익명, 30분 중복 제거, 항상 204 */
export async function POST(req: Request) {
  if (isBotUa(req.headers.get("user-agent"))) return new NextResponse(null, { status: 204 });
  const body = (await req.json().catch(() => null)) as { path?: string; lang?: string } | null;
  const hash = visitorHash(req);
  if (!body || typeof body.path !== "string" || !hash) return new NextResponse(null, { status: 204 });
  try {
    await getAdminSupabase().rpc("record_doc_view", { p_path: body.path.slice(0, 120), p_lang: typeof body.lang === "string" ? body.lang.slice(0, 2) : "ko", p_hash: hash });
  } catch {
    /* 무시 */
  }
  return new NextResponse(null, { status: 204 });
}
