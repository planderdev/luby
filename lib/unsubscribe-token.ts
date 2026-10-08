import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { EmailCategory } from "@/lib/notification-categories";
import { getAdminSupabase } from "@/lib/supabase/admin";

/** 원클릭 수신 거부 링크용 HMAC 토큰 (비밀: NOTIFICATION_WEBHOOK_SECRET 재사용, 만료 없음 — 사용자별·카테고리별 고정) */
function secret() {
  const s = process.env.NOTIFICATION_WEBHOOK_SECRET;
  if (!s) throw new Error("NOTIFICATION_WEBHOOK_SECRET missing");
  return s;
}
function sign(secretValue: string, userId: string, category: EmailCategory | "all"): string {
  return createHmac("sha256", secretValue).update(`unsub:${userId}:${category}`).digest("base64url").slice(0, 32);
}
function safeEqual(expected: string, token: string): boolean {
  const a = Buffer.from(expected), b = Buffer.from(token ?? "");
  return a.length === b.length && timingSafeEqual(a, b);
}
export function signUnsubscribe(userId: string, category: EmailCategory | "all"): string {
  return sign(secret(), userId, category);
}
export function verifyUnsubscribe(userId: string, category: EmailCategory | "all", token: string): boolean {
  return safeEqual(signUnsubscribe(userId, category), token);
}
/**
 * 현행 시크릿으로 실패하면 로테이션 전 시크릿(app_secrets.unsubscribe_prev_secret, rotate_webhook_secret 이 30일 보관)으로
 * 한 번 더 검증한다 — 이미 발송된 메일의 수신 거부 링크가 로테이션 직후에도 동작해야 한다.
 */
export async function verifyUnsubscribeAny(userId: string, category: EmailCategory | "all", token: string): Promise<boolean> {
  if (verifyUnsubscribe(userId, category, token)) return true;
  try {
    const { data } = await getAdminSupabase().from("app_secrets").select("value, expires_at").eq("key", "unsubscribe_prev_secret").maybeSingle();
    if (!data?.value) return false;
    if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) return false;
    return safeEqual(sign(data.value, userId, category), token);
  } catch {
    return false;
  }
}
export function unsubscribeUrl(siteUrl: string, userId: string, category: EmailCategory | "all", locale: "ko" | "en" | "zh" = "ko"): string {
  const t = signUnsubscribe(userId, category);
  // lang 은 안내 페이지 언어만 정한다 (토큰 서명 범위 밖)
  return `${siteUrl}/api/notifications/unsubscribe?u=${encodeURIComponent(userId)}&c=${category}&t=${t}${locale !== "ko" ? `&lang=${locale}` : ""}`;
}
