"use client";

import { useEffect, useState, useTransition } from "react";
import { BellRing, Loader2, X } from "lucide-react";
import { detectPushSupport, getExistingSubscription, subscribeToPush, pushErrorMessage } from "@/lib/push-client";
import { savePushSubscription } from "@/app/dashboard/settings/actions";

const DISMISS_KEY = "luby:push-nudge-dismissed";

/**
 * 푸시 켜기 유도 배너 — 지원 브라우저 + 이 기기에 구독이 없을 때 1회.
 * "나중에" 를 누르면 이 기기에서는 다시 띄우지 않는다 (localStorage). iOS 브라우저 탭은 설치 안내 대신 숨김(설정에서 안내).
 */
export function PushNudgeBanner({ hasAnySubscription }: { hasAnySubscription: boolean }) {
  const [show, setShow] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (hasAnySubscription) return;
    if (localStorage.getItem(DISMISS_KEY)) return;
    if (detectPushSupport() !== "ready") return;
    getExistingSubscription().then((s) => { if (!s) setShow(true); }).catch(() => {});
  }, [hasAnySubscription]);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setShow(false);
  }

  function enable() {
    setError(null);
    startTransition(async () => {
      try {
        const sub = await subscribeToPush();
        const r = await savePushSubscription(sub, navigator.userAgent);
        if (!r.ok) throw new Error(r.error);
        setDone(true);
        localStorage.setItem(DISMISS_KEY, String(Date.now()));
        setTimeout(() => setShow(false), 2500);
      } catch (e) {
        setError(pushErrorMessage(e, "푸시를 켜지 못했습니다."));
        // 권한 거부 등 — 더 이상 묻지 않음
        localStorage.setItem(DISMISS_KEY, String(Date.now()));
      }
    });
  }

  if (!show) return null;
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent/30 bg-accent-soft/40 px-5 py-4">
      <div className="flex items-center gap-2.5 text-sm">
        <BellRing className="size-4 shrink-0 text-accent-ink" />
        {done ? (
          <span>푸시 알림이 켜졌어요. 앱을 닫아도 응모·선정·승인 소식을 바로 받습니다.</span>
        ) : (
          <span>
            <b>푸시 알림</b>을 켜면 앱을 닫아 둔 동안에도 응모·선정·승인 소식을 이 기기로 바로 받아요.
            {error && <span className="ml-2 text-xs text-danger">{error}</span>}
          </span>
        )}
      </div>
      {!done && (
        <div className="flex items-center gap-2">
          <button type="button" onClick={dismiss} className="rounded-full px-3 py-1.5 text-xs text-muted-foreground hover:bg-background/60 hover:text-foreground">
            나중에
          </button>
          <button type="button" onClick={enable} disabled={pending} className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-xs font-medium text-background disabled:opacity-60">
            {pending && <Loader2 className="size-3.5 animate-spin" />} 켜기
          </button>
          <button type="button" onClick={dismiss} aria-label="닫기" className="rounded-full p-1 text-muted-foreground hover:bg-background/60 hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}
