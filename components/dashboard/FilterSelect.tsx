"use client";

import { ChevronDown } from "lucide-react";

export type FilterOption = { value: string; label: string };

/**
 * 필터바 공용 셀렉트 — 네이티브 화살표를 숨기고 자체 셰브론으로 통일.
 * 기본값이 아닌 값이 선택되면(필터 적용) 테두리·굵기로 구분한다.
 */
export function FilterSelect({
  value,
  options,
  onChange,
  ariaLabel,
  defaultValue = "",
}: {
  value: string;
  options: FilterOption[];
  onChange: (v: string) => void;
  ariaLabel: string;
  /** 이 값이면 "미적용" 상태로 표시 (정렬처럼 기본 선택이 있는 경우 지정) */
  defaultValue?: string;
}) {
  const active = value !== defaultValue;
  return (
    <span className="relative inline-flex">
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full cursor-pointer appearance-none rounded-full border py-2.5 pl-4 pr-9 text-sm outline-none transition-colors focus-visible:border-foreground ${
          active
            ? "border-foreground/50 bg-muted font-medium"
            : "border-border bg-background hover:bg-muted"
        }`}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className={`pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 ${
          active ? "text-foreground" : "text-muted-foreground"
        }`}
      />
    </span>
  );
}
