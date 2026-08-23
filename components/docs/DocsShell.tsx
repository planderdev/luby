import Image from "next/image";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { loadDocs, searchIndex } from "@/lib/docs/content";
import { docsDict, docsPrefix, DOCS_LOCALES, type DocsLocale } from "@/lib/docs/i18n";
import { DocsSidebar } from "@/components/docs/DocsSidebar";
import { DocsSearch } from "@/components/docs/DocsSearch";

/** 가이드 셸 — 상단 바(로고·언어·검색·대시보드), 좌측 목차, 본문. 운영자 그룹은 운영자에게만 */
export async function DocsShell({ lang, children }: { lang: DocsLocale; children: React.ReactNode }) {
  const t = docsDict[lang];
  const profile = await getCurrentProfile();
  const includeOperator = profile?.role === "operator";
  const groups = loadDocs({ includeOperator, lang });
  const base = docsPrefix(lang);
  const nav = groups.map((g) => ({ key: g.key, title: t.groups[g.key] ?? g.title, description: t.groupDesc[g.key] ?? g.description, pages: g.pages.map((p) => ({ slug: p.slug, title: p.title })) }));
  const index = searchIndex({ includeOperator, lang });

  return (
    <div className="min-h-dvh bg-canvas" lang={lang === "zh" ? "zh-CN" : lang}>
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-3 px-5">
          <div className="flex items-center gap-3">
            <Link href="/" aria-label="Luby AI" className="inline-flex"><Image src="/logo.png" alt="루비AI" width={1298} height={410} className="h-6 w-auto invert dark:invert-0" /></Link>
            <Link href={base} className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">{t.badge}</Link>
          </div>
          <div className="flex items-center gap-2">
            <nav aria-label="language" className="flex items-center gap-1 rounded-full border border-border p-0.5 text-[11px]">
              {DOCS_LOCALES.map((l) => (
                <Link key={l} href={docsPrefix(l)} hrefLang={l} className={`rounded-full px-2 py-0.5 ${l === lang ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}>
                  {l === "ko" ? "KR" : l === "en" ? "EN" : "CN"}
                </Link>
              ))}
            </nav>
            <DocsSearch items={index} labels={{ search: t.search, placeholder: t.searchPlaceholder, noResults: t.noResults, close: t.close }} />
            <Link href={profile ? "/dashboard" : "/login?redirect=/dashboard"} className="hidden items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted sm:inline-flex">
              {profile ? t.openDashboard : t.login} <ExternalLink className="size-3.5" />
            </Link>
          </div>
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-7xl gap-8 px-5 py-6 lg:py-10">
        <DocsSidebar groups={nav} base={base} labels={{ home: t.home, toc: t.toc, tocOpen: t.tocOpen, close: t.close }} />
        <div className="min-w-0 flex-1">
          {lang !== "ko" && <p className="mb-5 rounded-2xl border border-border bg-background px-4 py-2.5 text-xs text-muted-foreground">{t.onlyKo} <Link href="/docs" className="underline underline-offset-2 hover:text-foreground">KR →</Link></p>}
          {children}
        </div>
      </div>
    </div>
  );
}
