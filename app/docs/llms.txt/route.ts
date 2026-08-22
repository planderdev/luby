import { loadDocs } from "@/lib/docs/content";
import { getSiteUrl } from "@/lib/seo/site";

/** LLM 친화 색인 — 공개 가이드 전체를 한 파일로 */
export async function GET() {
  const base = getSiteUrl();
  const groups = loadDocs();
  const lines: string[] = ["# 루비AI 가이드", "", "> 글로벌 체험단 마케팅 플랫폼 루비AI(luby.im)의 공식 사용 가이드.", ""];
  for (const g of groups) {
    lines.push(`## ${g.title}`, "");
    for (const p of g.pages) lines.push(`- [${p.title}](${base}/docs/${g.key}/${p.slug})`);
    lines.push("");
  }
  lines.push("---", "");
  for (const g of groups) for (const p of g.pages) lines.push(`# ${g.title} · ${p.title}`, "", p.markdown, "");
  return new Response(lines.join("\n"), { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
