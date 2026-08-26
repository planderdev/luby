import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isBotUa, visitorHash, UUID_RE } from "@/lib/view-beacon";

export const runtime = "nodejs";

/** 공개 캠페인 페이지 조회 비콘 — 로그인 불필요, 항상 204. 방문자는 해시로만 저장, 봇 UA 제외 */
export async function POST(req: Request) {
  if (isBotUa(req.headers.get("user-agent"))) return new NextResponse(null, { status: 204 });
  const body = (await req.json().catch(() => null)) as { id?: string; source?: string; lang?: string } | null;
  const id = body?.id;
  const hash = visitorHash(req);
  if (!id || !UUID_RE.test(id) || !hash) return new NextResponse(null, { status: 204 });

  // 소유주·운영자 본인 조회는 집계에서 제외 (페이지가 서버에서 쿠키를 읽지 않도록 여기서 판단)
  try {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (auth.user) {
      const [{ data: profile }, { data: camp }] = await Promise.all([
        supabase.from("profiles").select("role").eq("id", auth.user.id).maybeSingle(),
        supabase.from("campaigns").select("advertiser_id").eq("id", id).maybeSingle(),
      ]);
      if (profile?.role === "operator" || camp?.advertiser_id === auth.user.id) return new NextResponse(null, { status: 204 });
    }
  } catch {
    /* 비로그인 */
  }

  try {
    await getAdminSupabase().rpc("record_campaign_view", {
      p_campaign: id,
      p_source: typeof body?.source === "string" ? body.source.slice(0, 10) : "direct",
      p_lang: typeof body?.lang === "string" ? body.lang.slice(0, 2) : "ko",
      p_hash: hash,
    });
  } catch {
    /* 추적 실패는 무시 */
  }
  return new NextResponse(null, { status: 204 });
}
