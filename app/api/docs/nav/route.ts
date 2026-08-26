import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { loadDocs, searchIndex } from "@/lib/docs/content";
import { docsDict, type DocsLocale } from "@/lib/docs/i18n";

/**
 * 운영자 전용 가이드 목차 — 로그인한 운영자에게만.
 *
 * /docs 페이지는 CDN 캐시를 살리려고 서버에서 쿠키를 읽지 않는다(공개 목차만 렌더).
 * 운영자 목차는 하이드레이션 이후 이 API 로 덧붙인다. 목차 제목도 여기서만 나가므로
 * 공개 HTML 에는 운영자 문서 목록이 실리지 않는다.
 */
export const dynamic = "force-dynamic";

const LANGS = new Set<DocsLocale>(["ko", "en", "zh"]);

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("lang") ?? "ko";
  const lang = (LANGS.has(raw as DocsLocale) ? raw : "ko") as DocsLocale;

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ groups: [], index: [] }, { headers: { "cache-control": "private, no-store" } });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", auth.user.id).maybeSingle();
  if (profile?.role !== "operator") return NextResponse.json({ groups: [], index: [] }, { headers: { "cache-control": "private, no-store" } });

  const t = docsDict[lang];
  const publicKeys = new Set(loadDocs({ lang }).map((g) => g.key));
  const groups = loadDocs({ includeOperator: true, lang })
    .filter((g) => !publicKeys.has(g.key))
    .map((g) => ({ key: g.key, title: t.groups[g.key] ?? g.title, description: t.groupDesc[g.key] ?? g.description, pages: g.pages.map((p) => ({ slug: p.slug, title: p.title })) }));
  const keys = new Set(groups.map((g) => g.key));
  const index = searchIndex({ includeOperator: true, lang }).filter((i) => keys.has(i.href.split("/").at(-2) ?? ""));

  return NextResponse.json({ groups, index }, { headers: { "cache-control": "private, no-store" } });
}
