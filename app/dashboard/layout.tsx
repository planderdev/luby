import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { MobileNav } from "@/components/dashboard/MobileNav";
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
      <div className="flex-1 min-w-0">
        {/* 모바일: 상단 헤더 + 하단 탭바 + 드로어 (lg 미만에서만 렌더) */}
        <MobileNav
          role={profile.role}
          name={profile.name}
          avatarUrl={profile.avatar_url}
          bell={<NotificationBell userId={profile.id} />}
        />

        {/* 데스크톱: 우상단 알림 벨 */}
        <div className="mx-auto hidden w-full max-w-6xl px-5 pt-5 md:px-8 lg:block lg:px-12">
          <div className="flex justify-end">
            <NotificationBell userId={profile.id} />
          </div>
        </div>

        {/* 콘텐츠 — 모바일은 하단 탭바 높이만큼 여백 */}
        <div className="mx-auto w-full max-w-6xl px-5 pb-24 pt-5 md:px-8 lg:px-12 lg:pb-14 lg:pt-4">
          {profile.role === "advertiser" && <SubscriptionBanner userId={profile.id} />}
          {children}
        </div>
      </div>
    </div>
  );
}
