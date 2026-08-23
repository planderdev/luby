"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BookOpen, ChevronDown, Menu, X } from "lucide-react";

export type NavGroup = { key: string; title: string; description: string; pages: { slug: string; title: string }[] };

/** 가이드 좌측 목차 — 데스크톱 고정, 모바일은 토글 */
export function DocsSidebar({ groups, base = "/docs", labels = { home: "가이드 홈", toc: "목차", tocOpen: "목차 열기", close: "닫기" } }: { groups: NavGroup[]; base?: string; labels?: { home: string; toc: string; tocOpen: string; close: string } }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const activeGroup = groups.find((g) => pathname.startsWith(`${base}/${g.key}`))?.key;

  const nav = (
    <nav aria-label={labels.toc} className="text-sm">
      <Link href={base} onClick={() => setOpen(false)} className={`mb-3 flex items-center gap-2 rounded-xl px-3 py-2 font-medium ${pathname === base ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
        <BookOpen className="size-4" /> {labels.home}
      </Link>
      {groups.map((g) => {
        const isCollapsed = collapsed[g.key] ?? (activeGroup ? activeGroup !== g.key : false);
        return (
          <div key={g.key} className="mb-1">
            <button type="button" onClick={() => setCollapsed((c) => ({ ...c, [g.key]: !isCollapsed }))} className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground">
              {g.title}
              <ChevronDown className={`size-3.5 transition-transform ${isCollapsed ? "-rotate-90" : ""}`} />
            </button>
            {!isCollapsed && (
              <ul className="mb-2 space-y-0.5 border-l border-border pl-2">
                {g.pages.map((p) => {
                  const href = `${base}/${g.key}/${p.slug}`;
                  const active = pathname === href;
                  return (
                    <li key={p.slug}>
                      <Link href={href} onClick={() => setOpen(false)} className={`block rounded-lg px-3 py-1.5 text-[13px] leading-snug ${active ? "bg-accent-soft font-medium text-accent-ink" : "text-foreground/80 hover:bg-muted hover:text-foreground"}`}>
                        <span className="mr-1.5 tabular-nums text-muted-foreground">{p.slug}.</span>{p.title}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </nav>
  );

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium lg:hidden" aria-label={labels.tocOpen}>
        <Menu className="size-4" /> {labels.toc}
      </button>
      <aside className="sticky top-20 hidden max-h-[calc(100dvh-6rem)] w-64 shrink-0 overflow-y-auto pr-4 lg:block">{nav}</aside>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-foreground/30" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[82%] max-w-xs overflow-y-auto bg-background p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold">{labels.toc}</span>
              <button type="button" onClick={() => setOpen(false)} aria-label={labels.close} className="rounded-full p-1 hover:bg-muted"><X className="size-4" /></button>
            </div>
            {nav}
          </div>
        </div>
      )}
    </>
  );
}
