"use client";

import { createContext, useContext, useTransition, type ReactNode, type MouseEvent } from "react";
import { useRouter } from "next/navigation";

type Ctx = { navigate: (url: string) => void; pending: boolean };
const PendingNavCtx = createContext<Ctx | null>(null);

/** 필터바 등에서 호출 — PendingNavArea 안이면 전환 상태가 표시되는 navigate 를 돌려준다 */
export function usePendingNav() {
  return useContext(PendingNavCtx);
}

/**
 * 쿼리 필터 네비게이션 영역 — searchParams 만 바뀌는 이동은 loading.tsx 가 뜨지 않아
 * 클릭 후 응답까지 아무 표시가 없다. 이 래퍼가 상단 진행 바 + 콘텐츠 흐림 + 중복 클릭 잠금을 제공한다.
 * `data-pending-nav` 를 단 <a>/<Link> 클릭도 가로채 같은 전환으로 처리한다.
 */
export function PendingNavArea({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const navigate = (url: string) => startTransition(() => router.replace(url, { scroll: false }));

  function onClickCapture(e: MouseEvent<HTMLDivElement>) {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    const a = (e.target as HTMLElement).closest?.("a[data-pending-nav]") as HTMLAnchorElement | null;
    if (!a) return;
    const href = a.getAttribute("href");
    if (!href || !href.startsWith("/")) return;
    e.preventDefault();
    startTransition(() => router.push(href, { scroll: false }));
  }

  return (
    <PendingNavCtx.Provider value={{ navigate, pending }}>
      <div className="relative" onClickCapture={onClickCapture} aria-busy={pending}>
        {pending && (
          <div className="absolute inset-x-0 top-0 z-20 h-0.5 overflow-hidden rounded-full bg-accent-soft">
            <div className="h-full w-1/3 rounded-full bg-accent" style={{ animation: "pending-bar 0.9s ease-in-out infinite" }} />
          </div>
        )}
        <div className={pending ? "pointer-events-none opacity-55 transition-opacity duration-200" : "transition-opacity duration-200"}>{children}</div>
      </div>
    </PendingNavCtx.Provider>
  );
}
