import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadDocs } from "@/lib/docs/content";
import { docsDict, type DocsLocale } from "@/lib/docs/i18n";
import { DocsShell } from "@/components/docs/DocsShell";
import { DocsHome } from "@/components/docs/DocsHome";
import { DocPageView, docPageMetadata } from "@/components/docs/DocPageView";

/**
 * /docs 캐치올: [] 홈(ko) · [en|zh] 홈 · [group, slug] ko 페이지 · [en|zh, group, slug] 번역 페이지.
 * (라우트 그룹으로 나누면 같은 위치의 동적 세그먼트 이름이 충돌하므로 한 곳에서 해석)
 */
export const revalidate = 600; // 인기 문서·조회 기반 요소가 10분마다 갱신되도록 ISR

type Params = Promise<{ parts?: string[] }>;
const LANGS = ["en", "zh"] as const;

function resolve(parts: string[] | undefined): { lang: DocsLocale; group?: string; slug?: string } | null {
  const p = parts ?? [];
  if (p.length === 0) return { lang: "ko" };
  if (p.length === 1) return (LANGS as readonly string[]).includes(p[0]) ? { lang: p[0] as DocsLocale } : null;
  if (p.length === 2) return { lang: "ko", group: p[0], slug: p[1] };
  if (p.length === 3 && (LANGS as readonly string[]).includes(p[0])) return { lang: p[0] as DocsLocale, group: p[1], slug: p[2] };
  return null;
}

export async function generateStaticParams() {
  const ko = loadDocs().flatMap((g) => g.pages.map((p) => ({ parts: [g.key, p.slug] })));
  const i18n = LANGS.flatMap((lang) => [{ parts: [lang] }, ...loadDocs({ lang }).flatMap((g) => g.pages.map((p) => ({ parts: [lang, g.key, p.slug] })))]);
  return [{ parts: [] }, ...ko, ...i18n];
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const r = resolve((await params).parts);
  if (!r) return { title: "404", robots: { index: false } };
  const t = docsDict[r.lang];
  if (!r.group || !r.slug) return { title: { absolute: t.siteTitle }, description: t.homeSub };
  const m = docPageMetadata(r.lang, r.group, r.slug);
  return { ...m, title: { absolute: typeof m.title === "string" ? `${m.title} — ${t.siteTitle}` : t.siteTitle } };
}

export default async function DocsCatchAll({ params }: { params: Params }) {
  const r = resolve((await params).parts);
  if (!r) notFound();
  return (
    <DocsShell lang={r.lang}>
      {r.group && r.slug ? <DocPageView lang={r.lang} group={r.group} slug={r.slug} /> : <DocsHome lang={r.lang} />}
    </DocsShell>
  );
}
