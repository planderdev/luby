import { NextResponse, after } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { runCampaignPrecheck } from "@/lib/ai/precheck-run";

/**
 * 캠페인이 검수 대기(pending_approval)에 들어오면 AI 사전 점검 자동 실행 (DB 트리거 → pg_net).
 * 202 즉시 응답 후 after() 로 실행. 재신청(반려 후)도 내용이 바뀌었으므로 다시 점검한다.
 */
export const maxDuration = 60;

export async function POST(req: Request) {
  const secret = process.env.NOTIFICATION_WEBHOOK_SECRET;
  if (!secret || req.headers.get("x-webhook-secret") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as { campaign_id?: string } | null;
  const campaignId = body?.campaign_id;
  if (!campaignId || !/^[0-9a-f-]{36}$/.test(campaignId)) {
    return NextResponse.json({ error: "campaign_id required" }, { status: 400 });
  }
  after(async () => {
    try {
      const admin = getAdminSupabase();
      const { data: c } = await admin.from("campaigns").select("id, status, ai_prechecked_at, updated_at").eq("id", campaignId).maybeSingle();
      if (!c || c.status !== "pending_approval") return;
      // 최신 점검이 이번 제출(updated_at) 이후라면 중복 실행하지 않음
      if (c.ai_prechecked_at && new Date(c.ai_prechecked_at).getTime() >= new Date(c.updated_at).getTime() - 5000) return;
      await runCampaignPrecheck(admin, campaignId);
    } catch (e) {
      console.error("[ai/precheck] failed", campaignId, e instanceof Error ? e.message : e);
    }
  });
  return NextResponse.json({ accepted: true }, { status: 202 });
}
