import {
  LayoutDashboard,
  BellRing,
  Megaphone,
  Inbox,
  CreditCard,
  Settings,
  Users,
  ShieldCheck,
  Star,
  Coins,
  Banknote,
  MessageSquare,
  Sparkles,
  Bug,
  IdCard,
  UserSearch,
  Mail,
  BarChart3,
 ScrollText } from "lucide-react";
import type { UserRole } from "@/lib/supabase/queries";

export type NavItem = {
  href: string;
  label: string;
  /** 모바일 하단 탭바용 짧은 라벨 (없으면 label 사용) */
  short?: string;
  icon: React.ComponentType<{ className?: string }>;
  /** true면 모바일 하단 탭바에 노출 (역할당 최대 5개 권장) */
  primary?: boolean;
};

/**
 * 대시보드 네비게이션 단일 정의 — 데스크톱 사이드바와 모바일 탭바/드로어가 공유한다.
 * 메뉴를 추가/삭제할 때 여기만 고치면 된다.
 */
export const dashboardNav: Record<UserRole, NavItem[]> = {
  advertiser: [
    { href: "/dashboard", label: "개요", icon: LayoutDashboard, primary: true },
    { href: "/dashboard/campaigns", label: "내 캠페인", short: "캠페인", icon: Megaphone, primary: true },
    { href: "/dashboard/applications", label: "응모자", icon: Inbox, primary: true },
    { href: "/dashboard/creators", label: "크리에이터 찾기", short: "찾기", icon: UserSearch },
    { href: "/dashboard/messages", label: "메시지", icon: MessageSquare, primary: true },
    { href: "/dashboard/billing", label: "구독·결제", short: "구독", icon: CreditCard },
    { href: "/dashboard/settings", label: "설정", icon: Settings, primary: true },
  ],
  influencer: [
    { href: "/dashboard", label: "개요", icon: LayoutDashboard, primary: true },
    { href: "/dashboard/campaigns", label: "캠페인 둘러보기", short: "캠페인", icon: Star, primary: true },
    { href: "/dashboard/applications", label: "내 응모", short: "응모", icon: Inbox, primary: true },
    { href: "/dashboard/invitations", label: "받은 초대", short: "초대", icon: Mail },
    { href: "/dashboard/messages", label: "메시지", icon: MessageSquare, primary: true },
    { href: "/dashboard/points", label: "포인트", icon: Coins },
    { href: "/dashboard/portfolio", label: "내 포트폴리오", short: "포트폴리오", icon: IdCard },
    { href: "/dashboard/settings", label: "설정·채널", short: "설정", icon: Settings, primary: true },
  ],
  operator: [
    { href: "/dashboard", label: "개요", icon: LayoutDashboard, primary: true },
    { href: "/dashboard/operator/users", label: "회원 관리", short: "회원", icon: Users, primary: true },
    { href: "/dashboard/creators", label: "크리에이터 풀", short: "크리에이터", icon: UserSearch },
    { href: "/dashboard/campaigns", label: "캠페인 풀", short: "캠페인", icon: Megaphone },
    { href: "/dashboard/operator/campaigns", label: "캠페인 검수", short: "검수", icon: ShieldCheck, primary: true },
    { href: "/dashboard/operator/payments", label: "결제 내역", short: "결제", icon: CreditCard },
    { href: "/dashboard/operator/withdrawals", label: "정산 관리", short: "정산", icon: Banknote, primary: true },
    { href: "/dashboard/operator/stats", label: "통계", icon: BarChart3, primary: true },
    { href: "/dashboard/operator/notices", label: "공지 팝업", short: "공지", icon: BellRing },
    { href: "/dashboard/operator/audit", label: "운영 기록", short: "기록", icon: ScrollText },
    { href: "/dashboard/operator/ai-usage", label: "AI 사용량", short: "AI", icon: Sparkles },
    { href: "/dashboard/operator/errors", label: "오류 로그", short: "오류", icon: Bug },
  ],
};

export const roleLabel: Record<UserRole, string> = {
  advertiser: "광고주",
  influencer: "인플루언서",
  operator: "운영자",
};

/** 현재 경로가 이 메뉴에 해당하는지 (하위 경로 포함, /dashboard는 정확히 일치만) */
export function isNavActive(href: string, pathname: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(href + "/");
}
