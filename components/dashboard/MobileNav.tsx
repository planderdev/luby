"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X, LogOut } from "lucide-react";
import type { UserRole } from "@/lib/supabase/queries";
import { dashboardNav, isNavActive, roleLabel } from "@/lib/dashboard-nav";
import { ThemeToggle } from "@/components/ThemeToggle";

/**
 * 모바일(<lg) 대시보드 네비게이션.
 * - 상단 헤더: 로고 · (알림 벨 슬롯) · 햄버거
 * - 하단 탭바: 역할별 primary 메뉴 (활성 상태 핑크)
 * - 드로어: 전체 메뉴 + 계정 + 로그아웃 (불투명 배경, ESC/배경 클릭 닫힘, 경로 변경 시 자동 닫힘)
 */
export function MobileNav({
  role,
  name,
  avatarUrl,
  bell,
}: {
  role: UserRole;
  name: string;
  avatarUrl?: string | null;
  /** 서버 컴포넌트인 NotificationBell을 슬롯으로 받음 */
  bell: ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const items = dashboardNav[role];
  const primary = items.filter((i) => i.primary).slice(0, 5);

  // 경로가 바뀌면 드로어 닫기
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // 드로어 열림 중 스크롤 잠금 + ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      {/* 상단 헤더 */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur lg:hidden">
        <Link href="/" aria-label="루비AI 홈" className="flex items-center">
          <Image
            src="/logo.png"
            alt="루비AI"
            width={1298}
            height={410}
            className="h-5 w-auto invert dark:invert-0"
          />
        </Link>
        <div className="flex items-center gap-2">
          {bell}
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="메뉴 열기"
            aria-expanded={open}
            className="inline-flex size-10 items-center justify-center rounded-full border border-border bg-background hover:bg-muted"
          >
            <Menu className="size-4.5" />
          </button>
        </div>
      </header>

      {/* 하단 탭바 */}
      <nav
        aria-label="주요 메뉴"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="grid" style={{ gridTemplateColumns: `repeat(${primary.length}, minmax(0, 1fr))` }}>
          {primary.map((it) => {
            const active = isNavActive(it.href, pathname);
            return (
              <li key={it.href}>
                <Link
                  href={it.href}
                  prefetch
                  aria-current={active ? "page" : undefined}
                  className={`flex flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium transition-colors ${
                    active ? "text-accent-ink" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span
                    className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${
                      active ? "bg-accent-soft" : ""
                    }`}
                  >
                    <it.icon className="size-[18px]" />
                  </span>
                  {it.short ?? it.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* 드로어 */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="전체 메뉴">
          <button
            type="button"
            aria-label="메뉴 닫기"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/60"
          />
          <div className="absolute inset-y-0 right-0 flex w-[82%] max-w-sm flex-col border-l border-border bg-background shadow-2xl">
            <div className="flex h-14 items-center justify-between border-b border-border px-4">
              <span className="text-sm font-semibold">메뉴</span>
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="닫기"
                  className="inline-flex size-9 items-center justify-center rounded-full border border-border hover:bg-muted"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-3">
              {items.map((it) => {
                const active = isNavActive(it.href, pathname);
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition-colors ${
                      active
                        ? "bg-accent-soft font-medium text-accent-ink"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <it.icon className="size-4.5" />
                    {it.label}
                  </Link>
                );
              })}
            </div>

            <div className="border-t border-border p-4">
              <div className="flex items-center gap-3 rounded-xl bg-muted/60 px-3 py-3">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt={name} className="size-9 shrink-0 rounded-full object-cover" />
                ) : (
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-foreground text-background text-sm font-semibold">
                    {name.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{name}</div>
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    {roleLabel[role]}
                  </div>
                </div>
              </div>
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full border border-border bg-background px-4 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="size-3.5" /> 로그아웃
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
