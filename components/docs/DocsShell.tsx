import Link from "next/link";
import { loadDocs, searchIndex } from "@/lib/docs/content";
import { docsDict, docsPrefix, type DocsLocale } from "@/lib/docs/i18n";
import { DocsSidebar } from "@/components/docs/DocsSidebar";
import { DocsSearch } from "@/components/docs/DocsSearch";
import { LreChrome, LreChromeFooter } from "@/components/landing-re/LreChrome";
import "@/app/lre-chrome.css";
import { withLang } from "@/lib/i18n/app-locale-shared";

/** 가이드 셸 — 랜딩 크롬(헤더·언어·로그인) + 가이드 서브바(배지·검색), 좌측 목차, 본문, 랜딩 푸터. 운영자 그룹은 운영자에게만 */
export async function DocsShell({ lang, children }: { lang: DocsLocale; children: React.ReactNode }) {
  const t = docsDict[lang];
  // 서버에서 쿠키를 읽지 않는다(읽는 순간 CDN 캐시가 꺼짐) — 운영자 목차는 DocsSidebar 가 클라이언트에서 덧붙인다
  const groups = loadDocs({ lang });
  const base = docsPrefix(lang);
  const nav = groups.map((g) => ({ key: g.key, title: t.groups[g.key] ?? g.title, description: t.groupDesc[g.key] ?? g.description, pages: g.pages.map((p) => ({ slug: p.slug, title: p.title })) }));
  const index = searchIndex({ lang });
  const partial = lang !== "ko" && groups.length < loadDocs({ lang: "ko" }).length;

  return (
    <div className="lre-offset min-h-dvh bg-canvas" lang={lang === "zh" ? "zh-CN" : lang}>
      <LreChrome
        locale={lang}
        langHrefs={{ ko: docsPrefix("ko"), en: docsPrefix("en"), zh: docsPrefix("zh") }}
        loginHref={withLang("/login?redirect=/dashboard", lang)}
        joinHref={withLang("/signup?role=influencer", lang)}
        dashboardLabel={t.openDashboard}
      />
      {/* 가이드 서브바 — 고정 헤더 바로 아래에 붙는다(top = 헤더 높이 변수) */}
      <div className="sticky z-30 border-b border-border bg-background/85 backdrop-blur" style={{ top: "var(--lre-header-h, 92px)" }}>
        <div className="mx-auto flex h-12 w-full max-w-7xl items-center justify-between gap-3 px-5">
          <Link href={base} className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">{t.badge}</Link>
          <DocsSearch items={index} lang={lang} labels={{ search: t.search, placeholder: t.searchPlaceholder, noResults: t.noResults, close: t.close }} />
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-7xl gap-8 px-5 py-6 lg:py-10">
        <DocsSidebar groups={nav} base={base} lang={lang} labels={{ home: t.home, toc: t.toc, tocOpen: t.tocOpen, close: t.close }} />
        <main className="min-w-0 flex-1">
          {partial && <p className="mb-5 rounded-2xl border border-border bg-background px-4 py-2.5 text-xs text-muted-foreground">{t.onlyKo} <Link href="/docs" className="underline underline-offset-2 hover:text-foreground">KR →</Link></p>}
          {children}
        </main>
      </div>
      <LreChromeFooter locale={lang} />
    </div>
  );
}
