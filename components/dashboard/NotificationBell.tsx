import { createClient } from "@/lib/supabase/server";
import { NotificationBellClient } from "./NotificationBellClient";

/** 서버: 초기 미읽음 카운트만 조회 → 클라이언트가 Realtime 으로 이어받음 */
export async function NotificationBell({ userId }: { userId: string }) {
  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);

  return <NotificationBellClient userId={userId} initialUnread={count ?? 0} />;
}
