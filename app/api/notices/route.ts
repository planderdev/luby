import { NextResponse } from "next/server";
import { getStaticSupabase } from "@/lib/supabase/static";

/**
 * 메인 랜딩에 띄울 공지 팝업 목록.
 *
 * 랜딩은 완전 정적으로 캐시되므로(서버에서 읽으면 캐시가 꺼진다) 팝업만 이 라우트로 따로 가져온다.
 * 노출 기간 판정은 RLS(notice_popups_public_read)가 하므로 여기서는 정렬만 한다.
 * CDN 60초 캐시 — 등록 직후 최대 1분 뒤에 보인다.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const { data, error } = await getStaticSupabase()
    .from("notice_popups")
    .select("id, title, image_url, link_url")
    .order("sort_order", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    // 팝업 때문에 랜딩이 깨지면 안 된다 — 빈 목록으로
    return NextResponse.json({ items: [] }, { headers: { "cache-control": "public, s-maxage=30" } });
  }

  return NextResponse.json(
    { items: data ?? [] },
    { headers: { "cache-control": "public, s-maxage=60, stale-while-revalidate=300" } }
  );
}
