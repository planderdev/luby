import { NextResponse, after } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { translateCampaign } from "@/lib/ai/campaign-translate";
import { revalidatePublicCampaign } from "@/lib/cache/public-revalidate";

/**
 * 캠페인이 공개 상태(open·closed·completed)가 되거나 공개 상태에서 수정되면 공개 페이지용 번역(영어·중국어 + 일본어·번체 중국어·태국어·베트남어·인도네시아어)을 만든다
 * (DB 트리거 trg_campaign_translate → pg_net). 202 즉시 응답 후 after() 로 실행. 원문 해시가 같으면 건너뛴다.
 */
// 영·중 + 추가 5개 언어를 2개씩 나눠 나란히 번역한다 — 호출이 겹치면 60초로는 모자랄 수 있다
export const maxDuration = 300;

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
      const r = await translateCampaign(getAdminSupabase(), campaignId);
      if (r.ok && !r.skipped) revalidatePublicCampaign(campaignId);
      if (!r.ok) console.error("[ai/translate-campaign] failed", campaignId, r.error);
    } catch (e) {
      console.error("[ai/translate-campaign] failed", campaignId, e instanceof Error ? e.message : e);
    }
  });
  return NextResponse.json({ accepted: true }, { status: 202 });
}
