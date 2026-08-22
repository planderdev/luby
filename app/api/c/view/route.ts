import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const BOT_RE = /bot|crawl|spider|slurp|facebookexternalhit|preview|lighthouse|headless|curl|wget|python-requests|kakaotalk-scrap|Twitterbot|WhatsApp|TelegramBot|Discordbot|vercel-screenshot/i;

/**
 * 공개 캠페인 페이지 조회 비콘 — 로그인 불필요.
 * 방문자 식별은 (서버 시크릿 + 날짜 + IP + UA) 해시로만 저장(역추적 불가, 매일 바뀜). 봇 UA 는 제외.
 */
export async function POST(req: Request) {
  const ua = req.headers.get("user-agent") ?? "";
  if (!ua || BOT_RE.test(ua)) return new NextResponse(null, { status: 204 });
  const body = (await req.json().catch(() => null)) as { id?: string; source?: string; lang?: string } | null;
  const id = body?.id;
  if (!id || !/^[0-9a-f-]{36}$/.test(id)) return new NextResponse(null, { status: 204 });
  const secret = process.env.NOTIFICATION_WEBHOOK_SECRET ?? "";
  if (!secret) return new NextResponse(null, { status: 204 });
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || req.headers.get("x-real-ip") || "0";
  const day = new Date().toISOString().slice(0, 10);
  const hash = createHash("sha256").update(`${secret}|${day}|${ip}|${ua}`).digest("hex").slice(0, 40);
  try {
    const admin = getAdminSupabase();
    await admin.rpc("record_campaign_view", {
      p_campaign: id,
      p_source: typeof body?.source === "string" ? body.source.slice(0, 10) : "direct",
      p_lang: typeof body?.lang === "string" ? body.lang.slice(0, 2) : "ko",
      p_hash: hash,
    });
  } catch {
    // 추적 실패는 조용히 무시
  }
  return new NextResponse(null, { status: 204 });
}
