import Link from "next/link";
import { ArrowRight, ChevronRight, Rocket } from "lucide-react";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { loadDocs } from "@/lib/docs/content";
import { docsDict, docsPrefix, type DocsLocale } from "@/lib/docs/i18n";

/** 가이드 홈 — 제목·설명·Quick Start·역할별 카드·다음 */
export async function DocsHome({ lang }: { lang: DocsLocale }) {
  const t = docsDict[lang];
  const base = docsPrefix(lang);
  const profile = await getCurrentProfile();
  const groups = loadDocs({ includeOperator: profile?.role === "operator", lang });
  const start = groups.find((g) => g.key === "start");
  const available = new Set(groups.map((g) => g.key));
  const quick = t.quick.filter((q) => available.has(q.href.split("/")[1]));
  const updated = groups.map((g) => g.updated).filter(Boolean).sort().at(-1);
  const creatorsHref = lang === "ko" ? "/creators" : `/${lang}/creators`;

  return (
    <article className="max-w-3xl">
      <h1 className="display text-3xl font-semibold tracking-tight md:text-4xl">{t.homeTitle}</h1>
      <p className="mt-3 text-base text-muted-foreground">{t.homeSub}</p>
      <div className="mt-6 flex flex-wrap gap-2">
        <Link href={profile ? "/dashboard" : "/signup"} className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background">{profile ? t.ctaDash : t.ctaStart} <ArrowRight className="size-4" /></Link>
        <Link href={creatorsHref} className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-5 py-2.5 text-sm font-medium hover:bg-muted">{t.ctaCreators}</Link>
      </div>

      {quick.length > 0 && (
        <div className="mt-10 overflow-hidden rounded-3xl glass-card">
          <div className="flex items-center gap-3 border-b border-border px-6 py-4">
            <div className="flex size-9 items-center justify-center rounded-xl bg-accent-soft"><Rocket className="size-4 text-accent-ink" /></div>
            <h2 className="text-lg font-semibold">{t.quickStart}</h2>
          </div>
          <ul>
            {quick.map((q) => (
              <li key={q.href} className="border-b border-border last:border-0">
                <Link href={`${base}${q.href}`} className="flex items-center justify-between px-6 py-3.5 text-sm hover:bg-muted/60">{q.title} <ChevronRight className="size-4 text-muted-foreground" /></Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <h2 className="mt-10 text-lg font-semibold">{t.byRole}</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {groups.filter((g) => g.key !== "start").map((g) => (
          <Link key={g.key} href={`${base}/${g.key}/${g.pages[0]?.slug ?? "1"}`} className="rounded-3xl glass-card p-5 transition-colors hover:bg-muted/40">
            <div className="text-base font-semibold">{t.groups[g.key] ?? g.title}</div>
            <p className="mt-1 text-sm text-muted-foreground">{t.groupDesc[g.key] ?? g.description}</p>
            <div className="mt-3 text-xs text-muted-foreground">{t.docsCount(g.pages.length)}</div>
          </Link>
        ))}
      </div>

      {start?.pages[0] && (
        <Link href={`${base}/start/${start.pages[0].slug}`} className="mt-10 flex items-center justify-between rounded-2xl border border-border bg-background px-5 py-4 text-sm hover:bg-muted/60">
          <span className="text-muted-foreground">{t.next}</span>
          <span className="inline-flex items-center gap-1 font-medium">{start.pages[0].title} <ChevronRight className="size-4" /></span>
        </Link>
      )}
      {updated && <p className="mt-6 text-xs text-muted-foreground">{t.updated} {updated}</p>}
    </article>
  );
}
