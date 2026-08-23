import "server-only";
import fs from "node:fs";
import path from "node:path";
import { marked } from "marked";

/**
 * 가이드 문서 소스 = docs/manuals/*.md (매뉴얼이 정본). 파일 1개 = 그룹, H2 1개 = 페이지.
 * 운영자 그룹은 운영자에게만 노출 (app/docs 에서 역할 확인).
 */
export type DocGroup = { key: string; title: string; file: string; operatorOnly?: boolean; description: string };
export const DOC_GROUPS: DocGroup[] = [
  { key: "start", title: "시작하기", file: "00-시작하기.md", description: "루비AI 소개, 역할별 바로가기, 요금제" },
  { key: "advertiser", title: "광고주 가이드", file: "01-광고주-매뉴얼.md", description: "가입부터 캠페인 만들기·모집·선정·검수·성과·결제까지" },
  { key: "creator", title: "크리에이터 가이드", file: "02-크리에이터-매뉴얼.md", description: "채널 등록, 응모, 체험·콘텐츠, 포인트 정산, 공개 프로필" },
  { key: "agency", title: "대행사 가이드", file: "03-대행사-매뉴얼.md", description: "클라이언트별 운영, 소싱, 보고" },
  { key: "operator", title: "운영자 가이드", file: "04-운영자-매뉴얼.md", operatorOnly: true, description: "회원·캠페인 검수·정산·통계·자동화" },
];

export type DocPage = {
  group: string;
  slug: string; // "1", "2", "2-1"
  order: number;
  title: string; // 번호·경로 제거
  subtitle: string | null; // " — `경로`" 부분
  markdown: string;
  html: string;
  headings: { id: string; text: string; level: 3 | 4 }[];
  updated: string | null;
};

const MANUAL_DIR = path.join(process.cwd(), "docs", "manuals");
export type DocsLang = "ko" | "en" | "zh";
const dirFor = (lang: DocsLang) => (lang === "ko" ? MANUAL_DIR : path.join(MANUAL_DIR, lang));

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[`*_~]/g, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60) || "section";
}

function rewriteLinks(md: string, lang: DocsLang): string {
  // 매뉴얼 간 상대 링크 → /docs 라우트 (번역본이 없는 그룹은 한국어 문서로)
  const base = lang === "ko" ? "/docs" : `/docs/${lang}`;
  const has = (file: string) => lang === "ko" || fs.existsSync(path.join(dirFor(lang), file));
  const to = (file: string, key: string) => `](${has(file) ? base : "/docs"}/${key}/1)`;
  return md
    .replace(/\]\(01-광고주-매뉴얼\.md\)/g, to("01-광고주-매뉴얼.md", "advertiser"))
    .replace(/\]\(02-크리에이터-매뉴얼\.md\)/g, to("02-크리에이터-매뉴얼.md", "creator"))
    .replace(/\]\(03-대행사-매뉴얼\.md\)/g, to("03-대행사-매뉴얼.md", "agency"))
    .replace(/\]\(04-운영자-매뉴얼\.md\)/g, to("04-운영자-매뉴얼.md", "operator"));
}

function parseFile(group: DocGroup, lang: DocsLang): { pages: DocPage[]; updated: string | null } {
  const full = path.join(dirFor(lang), group.file);
  if (!fs.existsSync(full)) return { pages: [], updated: null };
  const raw = fs.readFileSync(full, "utf8");
  const m = raw.split("\n").slice(0, 6).join("\n").match(/(\d{4}-\d{2}-\d{2})/);
  const updated = m?.[1] ?? new Date(fs.statSync(full).mtime).toISOString().slice(0, 10);

  const lines = raw.split("\n");
  const pages: DocPage[] = [];
  let cur: { head: string; body: string[] } | null = null;
  for (const line of lines) {
    if (/^## /.test(line)) {
      if (cur) pages.push(buildPage(group.key, cur.head, cur.body, updated, pages.length, lang));
      cur = { head: line.replace(/^## /, "").trim(), body: [] };
    } else if (cur) {
      cur.body.push(line);
    }
  }
  if (cur) pages.push(buildPage(group.key, cur.head, cur.body, updated, pages.length, lang));
  return { pages, updated };
}

function buildPage(groupKey: string, head: string, body: string[], updated: string | null, index: number, lang: DocsLang): DocPage {
  const numMatch = head.match(/^(\d+(?:-\d+)?)\.\s*/);
  const slug = numMatch ? numMatch[1] : String(index + 1);
  const rest = numMatch ? head.slice(numMatch[0].length) : head;
  const [titleRaw, ...subParts] = rest.split(" — ");
  const title = titleRaw.trim();
  const subtitle = subParts.length ? subParts.join(" — ").trim() : null;
  const markdown = rewriteLinks(body.join("\n").trim(), lang);

  const headings: DocPage["headings"] = [];
  const renderer = new marked.Renderer();
  renderer.heading = ({ text, depth }) => {
    const plain = text.replace(/<[^>]+>/g, "");
    const id = slugify(plain);
    if (depth === 3 || depth === 4) headings.push({ id, text: plain, level: depth });
    return `<h${depth} id="${id}"><a href="#${id}" class="anchor">${text}</a></h${depth}>`;
  };
  renderer.link = ({ href, text }) => {
    const external = /^https?:\/\//.test(href) && !href.startsWith("https://luby.im");
    return `<a href="${href}"${external ? ' target="_blank" rel="noopener noreferrer"' : ""}>${text}</a>`;
  };
  const html = marked.parse(markdown, { renderer, gfm: true, breaks: false }) as string;
  return { group: groupKey, slug, order: index, title, subtitle, markdown, html, headings, updated };
}

const cache = new Map<DocsLang, (DocGroup & { pages: DocPage[]; updated: string | null })[]>();

export function loadDocs(opts?: { includeOperator?: boolean; lang?: DocsLang }) {
  const lang = opts?.lang ?? "ko";
  if (!cache.has(lang) || process.env.NODE_ENV !== "production") {
    cache.set(lang, DOC_GROUPS.map((g) => ({ ...g, ...parseFile(g, lang) })).filter((g) => g.pages.length > 0));
  }
  return cache.get(lang)!.filter((g) => !g.operatorOnly || opts?.includeOperator);
}

export function findDoc(group: string, slug: string, opts?: { includeOperator?: boolean; lang?: DocsLang }) {
  const groups = loadDocs(opts);
  const g = groups.find((x) => x.key === group);
  if (!g) return null;
  const idx = g.pages.findIndex((p) => p.slug === slug);
  if (idx < 0) return null;
  const flat = groups.flatMap((x) => x.pages);
  const fi = flat.findIndex((p) => p.group === group && p.slug === slug);
  return { group: g, page: g.pages[idx], prev: flat[fi - 1] ?? null, next: flat[fi + 1] ?? null };
}

/** 검색 인덱스 (클라이언트용, 본문은 요약만) */
export function searchIndex(opts?: { includeOperator?: boolean; lang?: DocsLang }) {
  const base = !opts?.lang || opts.lang === "ko" ? "/docs" : `/docs/${opts.lang}`;
  return loadDocs(opts).flatMap((g) =>
    g.pages.map((p) => ({
      href: `${base}/${g.key}/${p.slug}`,
      group: g.title,
      title: p.title,
      text: p.markdown.replace(/[#`*_>|-]/g, " ").replace(/\s+/g, " ").slice(0, 600),
      headings: p.headings.map((h) => h.text),
    }))
  );
}
