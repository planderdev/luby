import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { fetchYouTubeChannel, fetchYouTubeChannelsByIds, youtubeConfigured } from "@/lib/channels/youtube";
import { refreshYouTubeChannels } from "@/lib/channels/youtube-refresh";

/**
 * 유튜브 채널 통계 주간 갱신 — pg_cron channel-stats-refresh(월 01:30 UTC)가 request_channel_stats_refresh() 로 부른다(x-webhook-secret).
 * YOUTUBE_API_KEY 가 없으면 아무것도 안 함. 6일 안에 갱신한 채널은 건너뛴다.
 */
export const maxDuration = 120;

export async function POST(req: Request) {
  const secret = process.env.NOTIFICATION_WEBHOOK_SECRET;
  if (!secret || req.headers.get("x-webhook-secret") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!youtubeConfigured()) return NextResponse.json({ ok: true, skipped: "youtube not configured" });
  const admin = getAdminSupabase();
  const { data: yt } = await admin.from("channel_types").select("id").eq("slug", "youtube").maybeSingle();
  if (!yt) return NextResponse.json({ ok: true, skipped: "no youtube type" });
  const since = new Date(Date.now() - 6 * 86_400_000).toISOString();
  const summary = await refreshYouTubeChannels({
    rows: async () => {
      const { data } = await admin
        .from("influencer_channels")
        .select("id, url, external_id")
        .eq("channel_type_id", yt.id)
        .or(`stats_updated_at.is.null,stats_updated_at.lt.${since}`)
        .limit(500);
      return data ?? [];
    },
    byUrl: fetchYouTubeChannel,
    byIds: fetchYouTubeChannelsByIds,
    save: async (id, c) => {
      await admin
        .from("influencer_channels")
        .update({
          ...(c.subscribers !== null ? { followers: c.subscribers } : {}),
          stats: { subscribers: c.subscribers, views: c.views, videos: c.videos, title: c.title },
          stats_source: "api",
          stats_updated_at: new Date().toISOString(),
          external_id: c.id,
        })
        .eq("id", id);
    },
  });
  console.log("[cron/channel-stats]", JSON.stringify(summary));
  return NextResponse.json({ ok: true, ...summary });
}
