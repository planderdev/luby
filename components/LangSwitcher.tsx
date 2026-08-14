"use client";

import { useEffect, useRef, useState } from "react";
import { Globe, Check } from "lucide-react";
import { localeNames, localePath, locales, type Locale } from "@/lib/i18n";

export function LangSwitcher({
  locale,
  align = "right",
}: {
  locale: Locale;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Language"
        className="flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Globe className="size-3.5" strokeWidth={1.8} />
        {localeNames[locale].code}
      </button>

      {open && (
        <div
          role="menu"
          className={`absolute top-full z-50 mt-2 w-40 overflow-hidden rounded-2xl border border-border bg-background p-1 shadow-[0_8px_40px_-12px_rgb(0_0_0/0.18)] ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {locales.map((l) => {
            const active = l === locale;
            return (
              <a
                key={l}
                href={localePath[l]}
                role="menuitem"
                hrefLang={l}
                className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm transition-colors hover:bg-muted ${
                  active ? "font-medium text-foreground" : "text-muted-foreground"
                }`}
              >
                <span>{localeNames[l].native}</span>
                {active && <Check className="size-4 text-accent" strokeWidth={2.5} />}
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
