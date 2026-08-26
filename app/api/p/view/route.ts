import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isBotUa, visitorHash, UUID_RE } from "@/lib/view-beacon";

export const runtime = "nodejs";

/** 공개 크리에이터 프로필(/p) 조회 비콘 — 공개 켜진 승인 크리에이터만 기록, 항상 204 */
export async function POST(req: Request) {
  if (isBotUa(req.headers.get("user-agent"))) return new NextResponse(null, { status: 204 });
  const body = (await req.json().catch(() => null)) as { id?: string; source?: string; lang?: string } | null;
  const id = body?.id;
  const hash = visitorHash(req);
  if (!id || !UUID_RE.test(id) || !hash) return new NextResponse(null, { status: 204 });

  // 본인·운영자 조회는 제외
  try {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (auth.user) {
      if (auth.user.id === id) return new NextResponse(null, { status: 204 });
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", auth.user.id).maybeSingle();
      if (profile?.role === "operator") return new NextResponse(null, { status: 204 });
    }
  } catch {
    /* 비로그인 */
  }

  try {
    await getAdminSupabase().rpc("record_creator_view", {
      p_creator: id,
      p_source: typeof body?.source === "string" ? body.source.slice(0, 10) : "direct",
      p_lang: typeof body?.lang === "string" ? body.lang.slice(0, 2) : "ko",
      p_hash: hash,
    });
  } catch {
    /* 추적 실패는 무시 */
  }
  return new NextResponse(null, { status: 204 });
}
