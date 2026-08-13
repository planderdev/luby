"use client";

import { useState } from "react";
import { Plus, MessagesSquare } from "lucide-react";
import { SectionLabel } from "./Features";
import type { Dict } from "@/lib/i18n";

export function FAQ({ dict }: { dict: Dict["faq"] }) {
  return (
    <section id="faq" className="border-t border-border bg-muted/40 py-28 lg:py-36">
      <div className="mx-auto w-full max-w-360 px-5 md:px-10 lg:px-16">
        <div className="grid gap-12 lg:grid-cols-[auto_1fr] lg:gap-20">
          {/* Left */}
          <div className="lg:max-w-sm">
            <SectionLabel>FAQ</SectionLabel>
            <h2 className="display mt-4 text-4xl font-semibold lg:text-5xl">{dict.heading}</h2>
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground lg:text-base">
              {dict.paragraph}
            </p>
            <a
              href="mailto:contact@plander.io"
              className="mt-8 inline-flex w-fit items-center gap-4 rounded-full bg-background px-6 py-3 text-left transition-colors hover:bg-accent-soft"
            >
              <MessagesSquare className="size-5 text-accent" />
              <span className="flex flex-col">
                <span className="text-sm font-medium">{dict.communityTitle}</span>
                <span className="text-xs text-muted-foreground">{dict.communitySub}</span>
              </span>
            </a>
          </div>

          {/* Right - accordion */}
          <div className="divide-y divide-border rounded-3xl glass-card">
            {dict.items.map((f, i) => (
              <FAQItem key={i} {...f} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-6 px-6 py-5 text-left transition-colors hover:bg-muted/40 lg:px-8 lg:py-6"
      >
        <span className="text-sm font-medium lg:text-base">{q}</span>
        <Plus
          className={`size-5 shrink-0 text-muted-foreground transition-transform duration-300 ${
            open ? "rotate-45 text-accent" : ""
          }`}
        />
      </button>
      <div
        className={`grid overflow-hidden transition-all duration-300 ease-out ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="min-h-0">
          <p className="px-6 pb-6 text-sm leading-relaxed text-muted-foreground lg:px-8 lg:pb-8">
            {a}
          </p>
        </div>
      </div>
    </div>
  );
}
