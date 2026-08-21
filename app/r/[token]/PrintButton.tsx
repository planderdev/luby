"use client";

import { Printer } from "lucide-react";

/** 브라우저 인쇄 다이얼로그 → "PDF로 저장" */
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-xs font-medium text-background hover:bg-foreground/90 print:hidden"
    >
      <Printer className="size-3.5" /> PDF로 저장 · 인쇄
    </button>
  );
}
