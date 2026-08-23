import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { findDoc, DOC_GROUPS } from "@/lib/docs/content";
import { docsDict, docsPrefix, type DocsLocale } from "@/lib/docs/i18n";
import { CopyMarkdownButton } from "@/components/docs/CopyMarkdownButton";
import { DocFeedback } from "@/components/docs/DocFeedback";

export function docPageMetadata(lang: DocsLocale, group: string, slug: string): Metadata {
  const t = docsDict[lang];
  const d = findDoc(group, slug, { includeOperator: true, lang });
  if (!d) return { title: "404", robots: { index: false } };
  const g = DOC_GROUPS.find((x) => x.key === group);
  const gTitle = t.groups[group] ?? d.group.title;
  return { title: `${d.page.title} — ${gTitle}`, description: `${gTitle} · ${d.page.title}${d.page.subtitle ? ` (${d.page.subtitle.replace(/`/g, "")})` : ""}`, robots: g?.operatorOnly ? { index: false } : undefined };
}

/** 가이드 문서 페이지 — 빵부스러기·본문·피드백·이전/다음·우측 목차 */
export async function DocPageView({ lang, group, slug }: { lang: DocsLocale; group: string; slug: string }) {
  const t = docsDict[lang];
  const base = docsPrefix(lang);
  const g = DOC_GROUPS.find((x) => x.key === group);
  if (!g) notFound();
  if (g.operatorOnly) {
    const profile = await getCurrentProfile();
    if (profile?.role !== "operator") notFound();
  }
  const d = findDoc(group, slug, { includeOperator: true, lang });
  if (!d) notFound();
  const { page, prev, next } = d;
  const isVisible = (p: typeof prev) => p && (!DOC_GROUPS.find((x) => x.key === p.group)?.operatorOnly || g.operatorOnly) ? p : null;
  const visiblePrev = isVisible(prev);
  const visibleNext = isVisible(next);

  return (
    <div className="flex gap-10">
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
