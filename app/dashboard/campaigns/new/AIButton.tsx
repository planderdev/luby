"use client";

import { Sparkles, Loader2 } from "lucide-react";

export function AIButton({
  onClick,
  pending,
  disabled,
  label = "AI 추천",
  variant = "soft",
}: {
  onClick: () => void;
  pending: boolean;
  disabled?: boolean;
  label?: string;
  variant?: "soft" | "primary";
}) {
  const styles =
    variant === "primary"
      ? "bg-foreground text-background hover:bg-foreground/90"
      : "border border-accent/40 bg-accent-soft text-accent-ink hover:bg-accent-soft/80";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending || disabled}
      aria-busy={pending}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed ${
        pending
          ? "bg-accent-strong text-white opacity-100 shadow-pink-sm"
          : `disabled:opacity-50 ${styles}`
      }`}
    >
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
      {pending ? "AI 생성 중…" : label}
    </button>
  );
}
