"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ThemeToggle } from "./ThemeToggle";
import { LangSwitcher } from "./LangSwitcher";
import type { Dict } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";

export function Nav({ dict, locale }: { dict: Dict["nav"]; locale: Locale }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? "border-b border-border/70 bg-background/80 backdrop-blur-xl"
          : "border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 w-full max-w-360 items-center justify-between px-5 md:px-10 lg:px-16">
        <a href="#" className="flex items-center" aria-label={dict.home}>
          <Image
            src="/logo.png"
            alt={dict.home}
            width={1298}
            height={410}
            priority
            className="h-7 w-auto invert dark:invert-0"
          />
        </a>

        <nav className="hidden items-center gap-1 lg:flex">
          {dict.menu.map((m) => (
            <a
              key={m.href}
              href={m.href}
              className="rounded-full px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {m.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <LangSwitcher locale={locale} />
          <ThemeToggle />
          <a
            href="/login"
            className="inline-block whitespace-nowrap rounded-full px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground sm:px-4"
          >
            {dict.login}
          </a>
          <a
            href="/signup"
            className="whitespace-nowrap rounded-full bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-transform hover:scale-[1.02] active:scale-[0.98] sm:px-5"
          >
            {dict.cta}
          </a>
        </div>
      </div>
    </header>
  );
}
