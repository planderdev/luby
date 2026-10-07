"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { dashboardDict } from "@/lib/i18n/app/dashboard";
import { localizeNotification } from "@/lib/notifications/localize";
import type { Locale } from "@/lib/i18n/config";

type Toast = { id: string; title: string; body: string | null; link: string | null };

const TOAST_MS = 7000;
const MAX_TOASTS = 3;

/**
 * 헤더 알림 벨 (클라이언트) — Supabase Realtime 으로 notifications 변경을 구독해
 * 배지를 즉시 갱신하고, 새 알림은 우하단 토스트로 띄운다.
 * 초기 카운트는 서버 컴포넌트(NotificationBell)가 넘긴다.
 */
export function NotificationBellClient({ userId, initialUnread, locale = "ko" }: { userId: string; initialUnread: number; locale?: Locale }) {
  const t = dashboardDict[locale].notifications;
  const [unread, setUnread] = useState(initialUnread);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const pathname = usePathname();
  const router = useRouter();
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  // 레이아웃이 벨을 모바일/데스크톱 두 번 렌더하므로 채널 토픽은 인스턴스별로 유일하게
  const instanceId = useId();
  // 네비게이션마다 재구독하지 않도록 최신 pathname 은 ref 로 읽는다
  const pathnameRef = useRef(pathname);
  useEffect(() => { pathnameRef.current = pathname; }, [pathname]);

  // 서버가 새 카운트를 넘기면(네비게이션·refresh) 동기화
  useEffect(() => setUnread(initialUnread), [initialUnread]);

  const dismiss = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
  }, []);

  const refetchCount = useCallback(async () => {
    const supabase = createClient();
    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("read_at", null);
    if (typeof count === "number") setUnread(count);
  }, [userId]);

  useEffect(() => {
    const supabase = createClient();
    // RLS 가 구독 범위를 본인 행으로 제한하도록 세션 JWT 를 realtime 소켓에 명시적으로 싣는다
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) supabase.realtime.setAuth(data.session.access_token);
    });
    const channel = supabase
      .channel(`notifications:${userId}:${instanceId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          const raw = payload.new as { id: string; type: string | null; title: string; body: string | null; link: string | null; read_at: string | null };
          const n = localizeNotification(raw, locale);
          if (!n.read_at) setUnread((u) => u + 1);
          setToasts((list) => [{ id: n.id, title: n.title, body: n.body, link: n.link }, ...list].slice(0, MAX_TOASTS));
          timers.current.set(n.id, setTimeout(() => dismiss(n.id), TOAST_MS));
          // 알림 목록을 보고 있으면 서버 목록도 갱신
          if (pathnameRef.current === "/dashboard/notifications") router.refresh();
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        () => void refetchCount() // 다른 탭에서 읽음 처리 등
      )
      .subscribe();

    const timerMap = timers.current;
    return () => {
      void supabase.removeChannel(channel);
      timerMap.forEach((t) => clearTimeout(t));
      timerMap.clear();
    };
  }, [userId, instanceId, router, refetchCount, dismiss, locale]);

  return (
    <>
      <Link
        href="/dashboard/notifications"
        aria-label={t.bellAria(unread)}
        className="relative inline-flex size-10 items-center justify-center rounded-full border border-border bg-background transition-colors hover:bg-muted"
      >
        <Bell className="size-4.5" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-strong px-1 text-[10px] font-bold text-background">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </Link>

      {toasts.length > 0 && (
        <div className="pointer-events-none fixed bottom-20 right-4 z-50 flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2 lg:bottom-6 lg:right-6" aria-live="polite">
          {toasts.map((x) => (
            <div
              key={x.id}
              className="pointer-events-auto flex items-start gap-3 rounded-2xl border border-border bg-background p-4 shadow-[0_12px_40px_-12px_rgba(21,18,23,0.25)] animate-fade-up"
            >
              <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-ink">
                <Bell className="size-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{x.title}</div>
                {x.body && <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{x.body}</p>}
                {x.link && (
                  <Link href={x.link} onClick={() => dismiss(x.id)} className="mt-1.5 inline-block text-xs font-medium underline underline-offset-2">
                    {t.open}
                  </Link>
                )}
              </div>
              <button type="button" onClick={() => dismiss(x.id)} aria-label={t.close} className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
                <X className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
