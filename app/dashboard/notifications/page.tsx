import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell } from "lucide-react";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { MarkAllReadButton } from "./MarkAllReadButton";
import { getAppLocale } from "@/lib/i18n/app-locale";
import { dashboardDict } from "@/lib/i18n/app/dashboard";
import { localizeNotification } from "@/lib/notifications/localize";

export async function generateMetadata() {
  const locale = await getAppLocale();
  const t = dashboardDict[locale].notifications.metaTitle;
  return { title: locale === "ko" ? t : { absolute: `${t} — Luby AI` } };
}

type T = (typeof dashboardDict)["ko"]["notifications"];
function timeAgo(iso: string, t: T): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return t.justNow;
  if (min < 60) return t.minutesAgo(min);
  const hr = Math.floor(min / 60);
  if (hr < 24) return t.hoursAgo(hr);
  const day = Math.floor(hr / 24);
  if (day < 7) return t.daysAgo(day);
  return new Date(iso).toLocaleDateString(t.dateLocale);
}

export default async function NotificationsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  // 크리에이터는 화면 언어로(알림 문구도 localizeNotification 으로 변환), 광고주·운영자는 한국어
  const locale = profile.role === "influencer" ? await getAppLocale({ profileLocale: profile.locale }) : "ko";
  const t = dashboardDict[locale].notifications;
  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, type, title, body, link, read_at, created_at")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const unreadCount = (notifications ?? []).filter((n) => !n.read_at).length;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-3xl font-semibold lg:text-4xl">{t.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {unreadCount > 0 ? t.unread(unreadCount) : t.allRead}
          </p>
        </div>
        {unreadCount > 0 && <MarkAllReadButton label={t.markAll} />}
      </div>

      {!notifications || notifications.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-dashed border-border bg-background p-10 text-center">
          <Bell className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            {t.empty}
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-2">
          {notifications.map((raw) => {
            const n = localizeNotification(raw, locale);
            const inner = (
              <div
                className={`flex items-start gap-3 rounded-2xl border p-4 transition-colors ${
                  n.read_at
                    ? "border-border bg-background"
                    : "border-accent/30 bg-accent-soft/30 hover:bg-accent-soft/50"
                }`}
              >
                {!n.read_at && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-accent" />}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-sm font-semibold">{n.title}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {timeAgo(n.created_at, t)}
                    </span>
                  </div>
                  {n.body && (
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{n.body}</p>
                  )}
                </div>
              </div>
            );
            return n.link ? (
              <Link key={n.id} href={n.link} className="block">
                {inner}
              </Link>
            ) : (
              <div key={n.id}>{inner}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}
