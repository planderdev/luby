import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { EmailCategory } from "@/lib/notification-categories";

/** 원클릭 수신 거부 링크용 HMAC 토큰 (비밀: NOTIFICATION_WEBHOOK_SECRET 재사용, 만료 없음 — 사용자별·카테고리별 고정) */
function secret() {
  const s = process.env.NOTIFICATION_WEBHOOK_SECRET;
  if (!s) throw new Error("NOTIFICATION_WEBHOOK_SECRET missing");
  return s;
}
export function signUnsubscribe(userId: string, category: EmailCategory | "all"): string {
  return createHmac("sha256", secret()).update(`unsub:${userId}:${category}`).digest("base64url").slice(0, 32);
}
export function verifyUnsubscribe(userId: string, category: EmailCategory | "all", token: string): boolean {
  const expected = signUnsubscribe(userId, category);
  const a = Buffer.from(expected), b = Buffer.from(token ?? "");
  return a.length === b.length && timingSafeEqual(a, b);
}
export function unsubscribeUrl(siteUrl: string, userId: string, category: EmailCategory | "all"): string {
  const t = signUnsubscribe(userId, category);
  return `${siteUrl}/api/notifications/unsubscribe?u=${encodeURIComponent(userId)}&c=${category}&t=${t}`;
}
