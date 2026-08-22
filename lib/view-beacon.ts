import { createHash } from "node:crypto";

const BOT_RE = /bot|crawl|spider|slurp|facebookexternalhit|preview|lighthouse|headless|curl|wget|python-requests|kakaotalk-scrap|Twitterbot|WhatsApp|TelegramBot|Discordbot|vercel-screenshot/i;

/** 조회 비콘 공통 — 봇 판별과 방문자 해시(서버 시크릿+날짜+IP+UA, 역추적 불가·매일 회전) */
export function isBotUa(ua: string | null): boolean {
  return !ua || BOT_RE.test(ua);
}

export function visitorHash(req: Request): string | null {
  const secret = process.env.NOTIFICATION_WEBHOOK_SECRET ?? "";
  if (!secret) return null;
  const ua = req.headers.get("user-agent") ?? "";
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || req.headers.get("x-real-ip") || "0";
  const day = new Date().toISOString().slice(0, 10);
  return createHash("sha256").update(`${secret}|${day}|${ip}|${ua}`).digest("hex").slice(0, 40);
}

export const UUID_RE = /^[0-9a-f-]{36}$/;
