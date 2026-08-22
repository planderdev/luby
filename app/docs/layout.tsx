import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { loadDocs, searchIndex } from "@/lib/docs/content";
import { DocsSidebar } from "@/components/docs/DocsSidebar";
import { DocsSearch } from "@/components/docs/DocsSearch";

export const metadata: Metadata = {
  title: { default: "루비AI 가이드", template: "%s — 루비AI 가이드" },
  description: "광고주·크리에이터·대행사를 위한 루비AI 공식 사용 가이드. 캠페인 만들기, 응모, 검수, 포인트 정산, 공개 페이지까지.",
};

/** 가이드 문서 셸 — 상단 바(로고·검색·대시보드), 좌측 목차, 본문. 운영자 그룹은 운영자에게만 */
export default async function DocsLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  const includeOperator = profile?.role === "operator";
  const groups = loadDocs({ includeOperator });
  const nav = groups.map((g) => ({ key: g.key, title: g.title, description: g.description, pages: g.pages.map((p) => ({ slug: p.slug, title: p.title })) }));
  const index = searchIndex({ includeOperator });

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-3 px-5">
          <div className="flex items-center gap-3">
            <Link href="/" aria-label="루비AI 홈" className="inline-flex"><Image src="/logo.png" alt="루비AI" width={1298} height={410} className="h-6 w-auto invert dark:invert-0" /></Link>
            <Link href="/docs" className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">가이드</Link>
          </div>
          <div className="flex items-center gap-2">
            <DocsSearch items={index} />
            <Link href={profile ? "/dashboard" : "/login?redirect=/dashboard"} className="hidden items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted sm:inline-flex">
              {profile ? "대시보드 열기" : "로그인"} <ExternalLink className="size-3.5" />
            </Link>
          </div>
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-7xl gap-8 px-5 py-6 lg:py-10">
        <DocsSidebar groups={nav} />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
