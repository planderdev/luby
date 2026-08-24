"use client";

import { useEffect, useState, useTransition } from "react";
import { BellRing, Loader2, Smartphone } from "lucide-react";
import { detectPushSupport, getExistingSubscription, subscribeToPush, unsubscribeFromPush, type PushSupport, pushErrorMessage } from "@/lib/push-client";
import { savePushSubscription, removePushSubscription } from "./actions";

/** 설정 > 푸시 알림: 이 기기에서 푸시 켜기/끄기. 이메일 카테고리 설정이 푸시에도 동일 적용. */
export function PushToggle({ subscriptionCount }: { subscriptionCount: number }) {
  const [support, setSupport] = useState<PushSupport>("unsupported");
  const [onThisDevice, setOnThisDevice] = useState<boolean | null>(null);
  const [count, setCount] = useState(subscriptionCount);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setSupport(detectPushSupport());
    getExistingSubscription().then((s) => setOnThisDevice(!!s)).catch(() => setOnThisDevice(false));
  }, []);

  function enable() {
    setError(null);
    startTransition(async () => {
      try {
        const sub = await subscribeToPush();
        const r = await savePushSubscription(sub, navigator.userAgent);
        if (!r.ok) throw new Error(r.error);
        setOnThisDevice(true);
        setCount((c) => c + 1);
        setSupport(detectPushSupport());
      } catch (e) {
        setError(pushErrorMessage(e, "푸시를 켜지 못했습니다."));
        setSupport(detectPushSupport());
      }
    });
  }

  function disable() {
    setError(null);
    startTransition(async () => {
      try {
        const endpoint = await unsubscribeFromPush();
        await removePushSubscription(endpoint);
        setOnThisDevice(false);
        setCount((c) => Math.max(0, c - 1));
      } catch (e) {
        setError(pushErrorMessage(e, "푸시를 끄지 못했습니다."));
      }
    });
  }

  return (
    <section id="push" className="scroll-mt-24 rounded-3xl glass-card p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft">
            <BellRing className="size-5 text-accent-ink" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">푸시 알림</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              앱을 닫아 둔 동안에도 응모·선정·승인·검수 같은 알림을 이 기기로 바로 받습니다. 이메일 수신 설정의 카테고리가 푸시에도 같이 적용돼요.
            </p>
            {count > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">현재 {count}개 기기에서 켜져 있어요.</p>
            )}
          </div>
        </div>

        <div className="shrink-0">
          {support === "needs-install" ? (
            <div className="max-w-xs rounded-2xl border border-border bg-muted/40 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
              <span className="flex items-center gap-1.5 font-medium text-foreground"><Smartphone className="size-3.5" /> iPhone 은 홈 화면에 설치 후 가능</span>
              Safari 공유 버튼 → <b>홈 화면에 추가</b> → 설치된 루비AI 앱에서 이 설정을 열어 켜주세요.
            </div>
          ) : support === "unsupported" ? (
            <span className="text-xs text-muted-foreground">이 브라우저는 푸시를 지원하지 않아요.</span>
          ) : support === "denied" ? (
            <span className="max-w-xs text-xs text-muted-foreground">브라우저에서 알림이 차단되어 있어요. 주소창 자물쇠 → 알림 허용 후 다시 시도해주세요.</span>
          ) : onThisDevice ? (
            <button type="button" onClick={disable} disabled={pending} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-60">
              {pending && <Loader2 className="size-3.5 animate-spin" />} 이 기기에서 끄기
            </button>
          ) : (
            <button type="button" onClick={enable} disabled={pending || onThisDevice === null} className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 disabled:opacity-60">
              {pending && <Loader2 className="size-3.5 animate-spin" />} 이 기기에서 켜기
            </button>
          )}
        </div>
      </div>
      {error && <p className="mt-3 text-xs text-danger">{error}</p>}
    </section>
  );
}
