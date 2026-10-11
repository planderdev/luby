import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { syncResendSuppressions } from "@/lib/resend-suppressions";

/**
 * Resend 차단 목록 → email_suppressions 동기화. pg_cron resend-suppression-sync(매일 09:10 KST)가
 * request_suppression_sync() 로 부른다(x-webhook-secret). 운영자는 회원 관리 '메일 반송' 탭에서 즉시 동기화할 수 있다.
 */
export const maxDuration = 60;

export async function POST(req: Request) {
  const secret = process.env.NOTIFICATION_WEBHOOK_SECRET;
  if (!secret || req.headers.get("x-webhook-secret") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const r = await syncResendSuppressions(getAdminSupabase(), process.env.RESEND_API_KEY);
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[cron/resend-suppressions] failed", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
