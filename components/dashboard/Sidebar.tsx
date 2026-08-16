import Link from "next/link";
import Image from "next/image";
import {
  LayoutDashboard,
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
  UserSearch,
  Mail,
} from "lucide-react";
import type { UserRole } from "@/lib/supabase/queries";
import { ThemeToggle } from "@/components/ThemeToggle";

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };

const itemsByRole: Record<UserRole, NavItem[]> = {
  advertiser: [
    { href: "/dashboard", label: "개요", icon: LayoutDashboard },
    { href: "/dashboard/campaigns", label: "내 캠페인", icon: Megaphone },
    { href: "/dashboard/applications", label: "응모자", icon: Inbox },
    { href: "/dashboard/creators", label: "크리에이터 찾기", icon: UserSearch },
    { href: "/dashboard/messages", label: "메시지", icon: MessageSquare },
    { href: "/dashboard/billing", label: "구독·결제", icon: CreditCard },
    { href: "/dashboard/settings", label: "설정", icon: Settings },
  ],
  influencer: [
    { href: "/dashboard", label: "개요", icon: LayoutDashboard },
    { href: "/dashboard/campaigns", label: "캠페인 둘러보기", icon: Star },
    { href: "/dashboard/applications", label: "내 응모", icon: Inbox },
    { href: "/dashboard/invitations", label: "받은 초대", icon: Mail },
    { href: "/dashboard/messages", label: "메시지", icon: MessageSquare },
    { href: "/dashboard/points", label: "포인트", icon: Coins },
    { href: "/dashboard/settings", label: "설정·채널", icon: Settings },
  ],
  operator: [
    { href: "/dashboard", label: "개요", icon: LayoutDashboard },
    { href: "/dashboard/operator/users", label: "회원 관리", icon: Users },
    { href: "/dashboard/creators", label: "크리에이터 풀", icon: UserSearch },
    { href: "/dashboard/operator/campaigns", label: "캠페인 검수", icon: ShieldCheck },
    { href: "/dashboard/operator/payments", label: "결제 내역", icon: CreditCard },
    { href: "/dashboard/operator/withdrawals", label: "정산 관리", icon: Banknote },
    { href: "/dashboard/operator/stats", label: "통계", icon: LayoutDashboard },
  ],
};

export function Sidebar({
  role,
  name,
  avatarUrl,
}: {
  role: UserRole;
  name: string;
  avatarUrl?: string | null;
}) {
  const items = itemsByRole[role];
  return (
    <aside className="hidden w-60 shrink-0 border-r border-border bg-background lg:flex lg:flex-col">
      <div className="flex h-16 items-center justify-between px-6">
        <Link href="/" aria-label="루비AI 홈">
          <Image
            src="/logo.png"
            alt="루비AI"
            width={1298}
            height={410}
            className="h-6 w-auto invert dark:invert-0"
          />
        </Link>
        <ThemeToggle />
      </div>

      <div className="flex flex-col gap-1 px-3 py-4">
        {items.map((it) => (
          <Link
            key={it.href}
            href={it.href}
            prefetch
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <it.icon className="size-4" />
            {it.label}
          </Link>
        ))}
      </div>

      <div className="mt-auto border-t border-border p-4">
        <div className="flex items-center gap-3 rounded-xl bg-muted/60 px-3 py-3">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt={name}
              className="size-9 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-foreground text-background text-sm font-semibold">
              {name.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{name}</div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {role === "advertiser" ? "광고주" : role === "influencer" ? "인플루언서" : "운영자"}
            </div>
          </div>
        </div>
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="mt-3 w-full rounded-full border border-border bg-background px-4 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            로그아웃
          </button>
        </form>
      </div>
    </aside>
  );
}
