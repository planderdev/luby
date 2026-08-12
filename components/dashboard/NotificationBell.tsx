import Link from "next/link";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export async function NotificationBell({ userId }: { userId: string }) {
  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);

  const unread = count ?? 0;

  return (
    <Link
      href="/dashboard/notifications"
      aria-label={`알림 ${unread}개`}
      className="relative inline-flex size-10 items-center justify-center rounded-full border border-border bg-background transition-colors hover:bg-muted"
    >
      <Bell className="size-4.5" />
      {unread > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-background">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}
