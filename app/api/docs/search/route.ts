import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { isBotUa, visitorHash } from "@/lib/view-beacon";

export const runtime = "nodejs";

/** 가이드 검색어 로그 — 검색어·결과 수·클릭 문서. 같은 방문자·검색어는 1시간 1건 */
export async function POST(req: Request) {
  if (isBotUa(req.headers.get("user-agent"))) return new NextResponse(null, { status: 204 });
  const body = (await req.json().catch(() => null)) as { q?: string; lang?: string; results?: number; clicked?: string } | null;
  const hash = visitorHash(req);
  if (!body || typeof body.q !== "string" || !hash) return new NextResponse(null, { status: 204 });
  try {
    await getAdminSupabase().rpc("record_doc_search", {
      p_query: body.q.slice(0, 80),
      p_lang: typeof body.lang === "string" ? body.lang.slice(0, 2) : "ko",
      p_results: Number.isFinite(body.results) ? Math.max(0, Math.floor(body.results as number)) : 0,
      p_clicked: typeof body.clicked === "string" && body.clicked.startsWith("/docs") ? body.clicked.slice(0, 160) : null,
      p_hash: hash,
    });
  } catch {
    /* 무시 */
  }
  return new NextResponse(null, { status: 204 });
}
