"use client";

/** 브라우저 측 웹 푸시 헬퍼 — 서비스 워커 등록·구독·해제. 서버 저장은 server action 으로. */
export type PushSupport = "unsupported" | "needs-install" | "denied" | "ready";

export function detectPushSupport(): PushSupport {
  if (typeof window === "undefined") return "unsupported";
  const ua = navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/.test(ua);
  const standalone = window.matchMedia?.("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
  // iOS 는 홈 화면에 설치한 PWA 에서만 Web Push 지원 (16.4+)
  if (isIOS && !standalone) return "needs-install";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  return "ready";
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!("serviceWorker" in navigator)) return null;
  const reg = await navigator.serviceWorker.getRegistration("/");
  return (await reg?.pushManager.getSubscription()) ?? null;
}

/** 권한 요청 → SW 등록 → 구독. 반환값은 서버에 저장할 JSON. */
export async function subscribeToPush(): Promise<{ endpoint: string; p256dh: string; auth: string }> {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!key) throw new Error("푸시 키가 설정되지 않았습니다.");
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("알림 권한이 허용되지 않았습니다.");
  const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key) }));
  const json = sub.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) throw new Error("구독 정보를 만들지 못했습니다.");
  return { endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth };
}

export async function unsubscribeFromPush(): Promise<string | null> {
  const sub = await getExistingSubscription();
  if (!sub) return null;
  const endpoint = sub.endpoint;
  await sub.unsubscribe();
  return endpoint;
}

/** 브라우저 푸시 오류 → 한국어 (NotAllowedError 등 영문 노출 방지) */
export function pushErrorMessage(e: unknown, fallback = "푸시를 켜지 못했습니다."): string {
  const raw = (e instanceof Error ? e.message : String(e ?? "")).trim();
  if (/[가-힣]/.test(raw)) return raw;
  if (/NotAllowed|denied|permission/i.test(raw)) return "브라우저에서 알림이 차단돼 있어요. 주소창 자물쇠 → 알림 허용 후 다시 시도해 주세요.";
  if (/AbortError|push service error|registration failed/i.test(raw)) return "브라우저 푸시 서비스에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.";
  if (/NotSupported|unsupported/i.test(raw)) return "이 브라우저는 푸시를 지원하지 않아요.";
  if (/InvalidState|SecurityError/i.test(raw)) return "설정을 적용하지 못했어요. 페이지를 새로고침한 뒤 다시 시도해 주세요.";
  return fallback;
}
