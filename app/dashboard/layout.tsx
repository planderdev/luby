import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { MobileNav } from "@/components/dashboard/MobileNav";
import { NotificationBell } from "@/components/dashboard/NotificationBell";
import Link from "next/link";
import { CircleHelp } from "lucide-react";
import { RefreshButton } from "@/components/dashboard/RefreshButton";
import { SubscriptionBanner } from "@/components/dashboard/SubscriptionBanner";
import { PushNudgeBanner } from "@/components/dashboard/PushNudgeBanner";
import { countPushSubscriptions } from "@/app/dashboard/settings/actions";

// Dashboard is private — exclude from search engines
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/login?redirect=/dashboard");
  }
  // 소셜 로그인 신규 가입자: 역할 확정 전에는 대시보드 대신 온보딩
  if (profile.onboarding_done === false) {
    redirect("/onboarding");
  }
  const pushCount = await countPushSubscriptions();

  return (
    <div className="flex min-h-dvh">
      <Sidebar role={profile.role} name={profile.name} avatarUrl={profile.avatar_url} />
      <div className="flex-1 min-w-0">
        {/* 모바일: 상단 헤더 + 하단 탭바 + 드로어 (lg 미만에서만 렌더) */}
        <MobileNav
          role={profile.role}
          name={profile.name}
          avatarUrl={profile.avatar_url}
          bell={
            <>
              <RefreshButton />
              <NotificationBell userId={profile.id} />
            </>
          }
        />

        {/* 데스크톱: 우상단 알림 벨 */}
        <div className="mx-auto hidden w-full max-w-6xl px-5 pt-5 md:px-8 lg:block lg:px-12">
          <div className="flex items-center justify-end gap-2">
            <Link href="/docs" target="_blank" rel="noopener" title="사용 가이드" aria-label="사용 가이드" className="inline-flex size-9 items-center justify-center rounded-full border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground">
              <CircleHelp className="size-4" />
            </Link>
            <RefreshButton />
            <NotificationBell userId={profile.id} />
          </div>
        </div>

        {/* 콘텐츠 — 모바일은 하단 탭바 높이만큼 여백 */}
        <div className="mx-auto w-full max-w-6xl px-5 pb-24 pt-5 md:px-8 lg:px-12 lg:pb-14 lg:pt-4">
          {profile.role === "advertiser" && <SubscriptionBanner userId={profile.id} />}
          <PushNudgeBanner hasAnySubscription={pushCount > 0} />
          {children}
        </div>
      </div>
    </div>
  );
}
