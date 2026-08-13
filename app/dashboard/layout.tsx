import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { NotificationBell } from "@/components/dashboard/NotificationBell";
import { SubscriptionBanner } from "@/components/dashboard/SubscriptionBanner";

// Dashboard is private — exclude from search engines
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/login?redirect=/dashboard");
  }

  return (
    <div className="flex min-h-dvh">
      <Sidebar role={profile.role} name={profile.name} avatarUrl={profile.avatar_url} />
      <div className="flex-1">
        <div className="mx-auto w-full max-w-6xl px-5 pt-5 md:px-8 lg:px-12">
          <div className="flex justify-end">
            <NotificationBell userId={profile.id} />
          </div>
        </div>
        <div className="mx-auto w-full max-w-6xl px-5 pb-10 pt-4 md:px-8 lg:px-12 lg:pb-14">
          {profile.role === "advertiser" && <SubscriptionBanner userId={profile.id} />}
          {children}
        </div>
      </div>
    </div>
  );
}
