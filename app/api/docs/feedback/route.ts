import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isBotUa, visitorHash } from "@/lib/view-beacon";

export const runtime = "nodejs";

/** 가이드 피드백 — 익명 가능, 로그인 시 user_id 첨부. 같은 방문자·문서는 24h 1건 */
export async function POST(req: Request) {
  if (isBotUa(req.headers.get("user-agent"))) return NextResponse.json({ ok: false }, { status: 204 });
  const body = (await req.json().catch(() => null)) as { path?: string; helpful?: boolean; comment?: string } | null;
  const hash = visitorHash(req);
  if (!body || typeof body.path !== "string" || typeof body.helpful !== "boolean" || !hash) return NextResponse.json({ ok: false }, { status: 400 });
  let userId: string | null = null;
  try {
    const { data } = await (await createClient()).auth.getUser();
    userId = data.user?.id ?? null;
  } catch {
    /* 비로그인 */
  }
  const { data, error } = await getAdminSupabase().rpc("record_doc_feedback", {
    p_path: body.path.slice(0, 120),
    p_helpful: body.helpful,
    p_comment: typeof body.comment === "string" ? body.comment.slice(0, 500) : null,
    p_user: userId,
    p_hash: hash,
  });
  if (error || !data) return NextResponse.json({ ok: false }, { status: 400 });
  return NextResponse.json({ ok: true });
}
