import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { findDoc, DOC_GROUPS, docDescription } from "@/lib/docs/content";
import { getSiteUrl } from "@/lib/seo/site";
import { docsDict, docsPrefix, type DocsLocale } from "@/lib/docs/i18n";
import { CopyMarkdownButton } from "@/components/docs/CopyMarkdownButton";
import { DocFeedback } from "@/components/docs/DocFeedback";
import { DocViewBeacon } from "@/components/docs/DocViewBeacon";

export function docPageMetadata(lang: DocsLocale, group: string, slug: string): Metadata {
  const t = docsDict[lang];
  const d = findDoc(group, slug, { includeOperator: true, lang });
  if (!d) return { title: "404", robots: { index: false } };
  const g = DOC_GROUPS.find((x) => x.key === group);
  const gTitle = t.groups[group] ?? d.group.title;
  // 검색 결과 문구는 본문에서 뽑는 편이 클릭을 끈다 — 건질 문장이 없으면 기존 기계 문구로
  const fallback = `${gTitle} · ${d.page.title}${d.page.subtitle ? ` (${d.page.subtitle.replace(/`/g, "")})` : ""}`;
  return { title: `${d.page.title} — ${gTitle}`, description: docDescription(d.page.markdown) ?? fallback, robots: g?.operatorOnly ? { index: false } : undefined };
}

/** 가이드 문서 페이지 — 빵부스러기·본문·피드백·이전/다음·우측 목차 */
export async function DocPageView({ lang, group, slug, allowOperator = false }: { lang: DocsLocale; group: string; slug: string; allowOperator?: boolean }) {
  const t = docsDict[lang];
  const base = docsPrefix(lang);
  const g = DOC_GROUPS.find((x) => x.key === group);
  if (!g) notFound();
  // 운영자 전용 문서는 세션 확인이 필요한 전용 라우트(app/docs/operator/[slug])에서만 연다.
  // 캐치올(/docs/…)은 캐시되는 정적 라우트라 여기서 쿠키를 읽을 수 없다.
  if (g.operatorOnly && !allowOperator) notFound();
  const d = findDoc(group, slug, { includeOperator: true, lang });
  if (!d) notFound();
  const { page, prev, next } = d;
  const isVisible = (p: typeof prev) => p && (!DOC_GROUPS.find((x) => x.key === p.group)?.operatorOnly || g.operatorOnly) ? p : null;
  const visiblePrev = isVisible(prev);
  const visibleNext = isVisible(next);

  // 검색 결과에 경로(가이드 > 그룹 > 문서)와 문서 정보를 노출한다. 운영자 전용 문서는 색인 대상이 아니라 제외.
  const site = getSiteUrl();
  const jsonLd = g.operatorOnly
    ? null
    : {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: t.breadcrumb, item: `${site}${base}` },
              { "@type": "ListItem", position: 2, name: t.groups[group] ?? d.group.title, item: `${site}${base}/${group}/${d.group.pages[0]?.slug ?? slug}` },
              { "@type": "ListItem", position: 3, name: page.title },
            ],
          },
          {
            "@type": "TechArticle",
            headline: page.title,
            description: docDescription(page.markdown) ?? `${t.groups[group] ?? d.group.title} · ${page.title}`,
            inLanguage: lang === "zh" ? "zh-CN" : lang === "en" ? "en" : "ko-KR",
            dateModified: page.updated ?? undefined,
            url: `${site}${base}/${group}/${slug}`,
            isPartOf: { "@type": "WebSite", name: t.siteTitle, url: `${site}/docs` },
            publisher: { "@type": "Organization", name: "루비AI", url: site },
          },
        ],
      };

  return (
    <div className="flex gap-10">
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />}
      <DocViewBeacon lang={lang} />
      <article className="min-w-0 max-w-3xl flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <nav aria-label="breadcrumb" className="flex items-center gap-1.5">
            <Link href={base} className="hover:text-foreground">{t.breadcrumb}</Link> <span>/</span>
            <span>{t.groups[group] ?? d.group.title}</span>
          </nav>
          <CopyMarkdownButton markdown={`# ${page.title}\n\n${page.markdown}`} labels={{ copy: t.copyMd, copied: t.copied }} />
        </div>
        <h1 className="display mt-3 break-keep text-3xl font-semibold tracking-tight md:text-4xl">{page.title}</h1>
        {page.subtitle && <p className="mt-2 text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: page.subtitle.replace(/`([^`]+)`/g, "<code>$1</code>") }} />}
        <div className="docs-prose mt-8" dangerouslySetInnerHTML={{ __html: page.html }} />
        <DocFeedback labels={{ q: t.fbQ, yes: t.fbYes, no: t.fbNo, placeholder: t.fbPlaceholder, cancel: t.fbCancel, send: t.fbSend, thanks: t.fbThanks, error: t.fbError }} />

        <div className="mt-12 grid gap-3 sm:grid-cols-2">
          {visiblePrev ? (
            <Link href={`${base}/${visiblePrev.group}/${visiblePrev.slug}`} className="flex items-center gap-2 rounded-2xl border border-border bg-background px-5 py-4 text-sm hover:bg-muted/60">
              <ChevronLeft className="size-4 text-muted-foreground" />
              <span><span className="block text-[11px] text-muted-foreground">{t.prev}</span><span className="font-medium">{visiblePrev.title}</span></span>
            </Link>
          ) : <span />}
          {visibleNext && (
            <Link href={`${base}/${visibleNext.group}/${visibleNext.slug}`} className="flex items-center justify-end gap-2 rounded-2xl border border-border bg-background px-5 py-4 text-right text-sm hover:bg-muted/60">
              <span><span className="block text-[11px] text-muted-foreground">{t.next}</span><span className="font-medium">{visibleNext.title}</span></span>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>
          )}
        </div>
        {page.updated && <p className="mt-6 text-xs text-muted-foreground">{t.updated} {page.updated}</p>}
      </article>
      {page.headings.length > 1 && (
        <aside className="sticky top-20 hidden w-52 shrink-0 self-start xl:block">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t.onThisPage}</div>
          <ul className="mt-3 space-y-1.5 border-l border-border text-[13px]">
            {page.headings.map((h) => (
              <li key={h.id}>
                <a href={`#${h.id}`} className={`block truncate pl-3 text-muted-foreground hover:text-foreground ${h.level === 4 ? "pl-6 text-xs" : ""}`}>{h.text}</a>
              </li>
            ))}
          </ul>
        </aside>
      )}
    </div>
  );
}
