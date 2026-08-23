import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { findDoc, loadDocs, DOC_GROUPS } from "@/lib/docs/content";
import { CopyMarkdownButton } from "@/components/docs/CopyMarkdownButton";
import { DocFeedback } from "@/components/docs/DocFeedback";

type Params = Promise<{ group: string; slug: string }>;

export async function generateStaticParams() {
  return loadDocs().flatMap((g) => g.pages.map((p) => ({ group: g.key, slug: p.slug })));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { group, slug } = await params;
  const d = findDoc(group, slug, { includeOperator: true });
  if (!d) return { title: "문서를 찾을 수 없어요", robots: { index: false } };
  const g = DOC_GROUPS.find((x) => x.key === group);
  return { title: `${d.page.title} — ${d.group.title}`, description: `${d.group.title} · ${d.page.title}${d.page.subtitle ? ` (${d.page.subtitle.replace(/`/g, "")})` : ""}`, robots: g?.operatorOnly ? { index: false } : undefined };
}

export default async function DocPage({ params }: { params: Params }) {
  const { group, slug } = await params;
  const g = DOC_GROUPS.find((x) => x.key === group);
  if (!g) notFound();
  if (g.operatorOnly) {
    const profile = await getCurrentProfile();
    if (profile?.role !== "operator") notFound();
  }
  const d = findDoc(group, slug, { includeOperator: true });
  if (!d) notFound();
  const { page, prev, next } = d;
  const visiblePrev = prev && (!DOC_GROUPS.find((x) => x.key === prev.group)?.operatorOnly || g.operatorOnly) ? prev : null;
  const visibleNext = next && (!DOC_GROUPS.find((x) => x.key === next.group)?.operatorOnly || g.operatorOnly) ? next : null;

  return (
    <div className="flex gap-10">
      <article className="min-w-0 max-w-3xl flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <nav aria-label="breadcrumb" className="flex items-center gap-1.5">
            <Link href="/docs" className="hover:text-foreground">가이드</Link> <span>/</span>
            <span>{d.group.title}</span>
          </nav>
          <CopyMarkdownButton markdown={`# ${page.title}\n\n${page.markdown}`} />
        </div>
        <h1 className="display mt-3 break-keep text-3xl font-semibold tracking-tight md:text-4xl">{page.title}</h1>
        {page.subtitle && <p className="mt-2 text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: page.subtitle.replace(/`([^`]+)`/g, "<code>$1</code>") }} />}
        <div className="docs-prose mt-8" dangerouslySetInnerHTML={{ __html: page.html }} />
        <DocFeedback />

        <div className="mt-12 grid gap-3 sm:grid-cols-2">
          {visiblePrev ? (
            <Link href={`/docs/${visiblePrev.group}/${visiblePrev.slug}`} className="flex items-center gap-2 rounded-2xl border border-border bg-background px-5 py-4 text-sm hover:bg-muted/60">
              <ChevronLeft className="size-4 text-muted-foreground" />
              <span><span className="block text-[11px] text-muted-foreground">이전</span><span className="font-medium">{visiblePrev.title}</span></span>
            </Link>
          ) : <span />}
          {visibleNext && (
            <Link href={`/docs/${visibleNext.group}/${visibleNext.slug}`} className="flex items-center justify-end gap-2 rounded-2xl border border-border bg-background px-5 py-4 text-right text-sm hover:bg-muted/60">
              <span><span className="block text-[11px] text-muted-foreground">다음</span><span className="font-medium">{visibleNext.title}</span></span>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>
          )}
        </div>
        {page.updated && <p className="mt-6 text-xs text-muted-foreground">마지막 업데이트 {page.updated}</p>}
      </article>
      {page.headings.length > 1 && (
        <aside className="sticky top-20 hidden w-52 shrink-0 self-start xl:block">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">이 페이지에서</div>
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
