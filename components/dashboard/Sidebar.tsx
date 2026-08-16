import Link from "next/link";
import Image from "next/image";
import type { UserRole } from "@/lib/supabase/queries";
import { ThemeToggle } from "@/components/ThemeToggle";
import { dashboardNav, roleLabel } from "@/lib/dashboard-nav";

export function Sidebar({
  role,
  name,
  avatarUrl,
}: {
  role: UserRole;
  name: string;
  avatarUrl?: string | null;
}) {
  const items = dashboardNav[role];
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
              {roleLabel[role]}
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
