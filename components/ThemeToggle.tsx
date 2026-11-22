"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const initial =
      (document.documentElement.classList.contains("dark") ? "dark" : "light") as Theme;
    setTheme(initial);
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    const root = document.documentElement;
    if (next === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", next === "dark" ? "#0a0a0c" : "#fbf8fc");
    try {
      localStorage.setItem("theme", next);
    } catch {}
  };

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "라이트 모드로 전환" : "다크 모드로 전환"}
      className="relative flex size-9 items-center justify-center rounded-full border border-border bg-background text-foreground transition-colors hover:bg-muted"
    >
      <Sun
        className={`absolute size-4 transition-all duration-300 ${
          isDark ? "scale-0 -rotate-90 opacity-0" : "scale-100 rotate-0 opacity-100"
        }`}
        strokeWidth={1.8}
      />
      <Moon
        className={`absolute size-4 transition-all duration-300 ${
          isDark ? "scale-100 rotate-0 opacity-100" : "scale-0 rotate-90 opacity-0"
        }`}
        strokeWidth={1.8}
      />
    </button>
  );
}
