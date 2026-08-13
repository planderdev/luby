import Link from "next/link";
import Image from "next/image";
import { ThemeToggle } from "@/components/ThemeToggle";

export function AuthShell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <main className="relative flex min-h-dvh">
      {/* left: form */}
      <section className="flex flex-1 flex-col px-6 py-10 md:px-16 lg:px-24">
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center" aria-label="루비AI 홈">
            <Image
              src="/logo.png"
              alt="루비AI"
              width={1298}
              height={410}
              className="h-7 w-auto invert dark:invert-0"
            />
          </Link>
          <ThemeToggle />
        </div>

        <div className="my-auto w-full max-w-md py-12">
          <h1 className="display text-3xl font-semibold lg:text-4xl">{title}</h1>
          <p className="mt-3 text-sm text-muted-foreground lg:text-base">{subtitle}</p>
          <div className="mt-10">{children}</div>
        </div>

        <p className="text-xs text-muted-foreground">
          © 2026 루비AI · <Link href="/" className="hover:text-foreground">홈으로</Link>
        </p>
      </section>

      {/* right: visual (hidden on mobile) */}
      <aside className="relative hidden flex-1 overflow-hidden bg-foreground text-background lg:block">
        <div
          aria-hidden
          className="bg-grid absolute inset-0 opacity-[0.07]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-40 top-1/3 size-[640px] rounded-full opacity-50 blur-3xl"
          style={{
            background:
              "radial-gradient(closest-side, rgb(236 72 153 / 0.5), transparent)",
          }}
        />
        <div className="relative flex h-full flex-col justify-end p-16">
          <div className="text-xs uppercase tracking-[0.2em] text-background/60">
            Global Campaign Platform
          </div>
          <p className="display mt-4 max-w-sm text-3xl font-semibold lg:text-4xl">
            전 세계 체험단을, 한 번의 캠페인으로.
          </p>
          <p className="mt-4 max-w-sm text-sm text-background/70">
            8,500명 이상의 글로벌 인플루언서가 루비AI에서 새 캠페인을 기다리고 있습니다.
          </p>
        </div>
      </aside>
    </main>
  );
}
