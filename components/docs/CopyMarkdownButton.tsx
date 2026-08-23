"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

/** 페이지 원문(Markdown) 복사 — AI 에게 붙여넣기용 */
export function CopyMarkdownButton({ markdown, labels = { copy: "Markdown 복사", copied: "복사됨" } }: { markdown: string; labels?: { copy: string; copied: string } }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try { await navigator.clipboard.writeText(markdown); setDone(true); setTimeout(() => setDone(false), 1500); } catch { /* ignore */ }
      }}
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
      title="이 페이지를 Markdown 으로 복사"
    >
      {done ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />} {done ? labels.copied : labels.copy}
    </button>
  );
}
