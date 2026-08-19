"use client";

import { useState } from "react";
import { Download } from "lucide-react";

/** 운영자 CSV 내보내기 — 기간 선택 후 /api/operator/export 로 다운로드 (엑셀 호환 UTF-8 BOM) */
export function ExportCsvButton({ type, label = "CSV 내보내기" }: { type: "payments" | "withdrawals"; label?: string }) {
  const today = new Date();
  const first = new Date(today.getFullYear(), today.getMonth(), 1);
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const [from, setFrom] = useState(iso(first));
  const [to, setTo] = useState(iso(today));
  const href = `/api/operator/export?type=${type}&from=${from}&to=${to}`;
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-full border border-border bg-background px-3 py-1.5" aria-label="시작일" />
      <span className="text-muted-foreground">~</span>
      <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-full border border-border bg-background px-3 py-1.5" aria-label="종료일" />
      <a href={href} className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 font-medium text-background">
        <Download className="size-3.5" /> {label}
      </a>
    </div>
  );
}
