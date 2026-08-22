import webpush from "web-push";
import { getAdminSupabase } from "@/lib/supabase/admin";

/**
 * 웹 푸시 발송 (service_role). 알림 생성 웹훅에서 호출.
 * 404/410 등 만료 구독은 즉시 삭제, 그 외 실패는 failed_count 누적(5회 시 삭제).
 */
let configured = false;
function ensureConfigured(): boolean {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  if (!configured) {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:contact@plander.io", pub, priv);
    configured = true;
  }
  return true;
}

export async function sendPushToUser(userId: string, payload: { title: string; body?: string | null; link?: string | null; tag?: string }): Promise<{ sent: number; removed: number; skipped?: string }> {
  if (!ensureConfigured()) return { sent: 0, removed: 0, skipped: "vapid not configured" };
  const admin = getAdminSupabase();
  const { data: subs } = await admin.from("push_subscriptions").select("id, endpoint, p256dh, auth, failed_count").eq("user_id", userId);
  if (!subs || subs.length === 0) return { sent: 0, removed: 0, skipped: "no subscriptions" };

  const body = JSON.stringify({ title: payload.title, body: payload.body ?? "", link: payload.link ?? "/dashboard", tag: payload.tag });
  let sent = 0, removed = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, { TTL: 60 * 60 * 24, urgency: "normal" });
        sent++;
        if (s.failed_count > 0) await admin.from("push_subscriptions").update({ failed_count: 0, last_seen_at: new Date().toISOString() }).eq("id", s.id);
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410 || s.failed_count + 1 >= 5) {
          await admin.from("push_subscriptions").delete().eq("id", s.id);
          removed++;
        } else {
          await admin.from("push_subscriptions").update({ failed_count: s.failed_count + 1 }).eq("id", s.id);
        }
      }
    })
  );
  return { sent, removed };
}
