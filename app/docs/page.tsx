import Link from "next/link";
import { ArrowRight, ChevronRight, Rocket } from "lucide-react";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { loadDocs } from "@/lib/docs/content";

export const metadata = { title: "루비AI 가이드" };

/** 가이드 홈 — 레퍼런스(GitBook 스타일): 제목·설명·Quick Start·역할별 카드·다음 */
export default async function DocsHome() {
  const profile = await getCurrentProfile();
  const groups = loadDocs({ includeOperator: profile?.role === "operator" });
  const start = groups.find((g) => g.key === "start");
  const quick = [
    { title: "광고주: 첫 캠페인 만들기 (AI에게 전부 맡기기)", href: "/docs/advertiser/2" },
    { title: "크리에이터: 가입과 채널 승인", href: "/docs/creator/1" },
    { title: "모집 늘리기 — 공유 링크·QR 포스터·AI 매칭", href: "/docs/advertiser/3" },
    { title: "포인트와 출금", href: "/docs/creator/6" },
  ];
  const updated = groups.map((g) => g.updated).filter(Boolean).sort().at(-1);

  return (
    <article className="max-w-3xl">
      <h1 className="display text-3xl font-semibold tracking-tight md:text-4xl">루비AI 가이드</h1>
      <p className="mt-3 text-base text-muted-foreground">광고주·크리에이터·대행사가 루비AI를 쓰는 데 필요한 모든 안내를 한곳에 모았어요.</p>
      <div className="mt-6 flex flex-wrap gap-2">
        <Link href={profile ? "/dashboard" : "/signup"} className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background">{profile ? "대시보드 바로가기" : "무료로 시작하기"} <ArrowRight className="size-4" /></Link>
        <Link href="/creators" className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-5 py-2.5 text-sm font-medium hover:bg-muted">크리에이터 안내 페이지</Link>
      </div>

      <div className="mt-10 overflow-hidden rounded-3xl glass-card">
        <div className="flex items-center gap-3 border-b border-border px-6 py-4">
          <div className="flex size-9 items-center justify-center rounded-xl bg-accent-soft"><Rocket className="size-4 text-accent-ink" /></div>
          <h2 className="text-lg font-semibold">Quick Start</h2>
        </div>
        <ul>
          {quick.map((q) => (
            <li key={q.href} className="border-b border-border last:border-0">
              <Link href={q.href} className="flex items-center justify-between px-6 py-3.5 text-sm hover:bg-muted/60">{q.title} <ChevronRight className="size-4 text-muted-foreground" /></Link>
            </li>
          ))}
        </ul>
      </div>

      <h2 className="mt-10 text-lg font-semibold">역할별 가이드</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {groups.filter((g) => g.key !== "start").map((g) => (
          <Link key={g.key} href={`/docs/${g.key}/${g.pages[0]?.slug ?? "1"}`} className="rounded-3xl glass-card p-5 transition-colors hover:bg-muted/40">
            <div className="text-base font-semibold">{g.title}</div>
            <p className="mt-1 text-sm text-muted-foreground">{g.description}</p>
            <div className="mt-3 text-xs text-muted-foreground">{g.pages.length}개 문서</div>
          </Link>
        ))}
      </div>

      {start?.pages[0] && (
        <Link href={`/docs/start/${start.pages[0].slug}`} className="mt-10 flex items-center justify-between rounded-2xl border border-border bg-background px-5 py-4 text-sm hover:bg-muted/60">
          <span className="text-muted-foreground">다음</span>
          <span className="inline-flex items-center gap-1 font-medium">{start.pages[0].title} <ChevronRight className="size-4" /></span>
        </Link>
      )}
      {updated && <p className="mt-6 text-xs text-muted-foreground">마지막 업데이트 {updated}</p>}
    </article>
  );
}
