"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { FilterSelect } from "@/components/dashboard/FilterSelect";

export type { FilterOption } from "@/components/dashboard/FilterSelect";
import type { FilterOption } from "@/components/dashboard/FilterSelect";

/**
 * 캠페인 목록 필터바 — 선택 즉시 URL 쿼리로 반영 (서버 컴포넌트가 다시 조회).
 * statusOptions는 광고주/운영자에게만 전달됨.
 */
export function CampaignFilters({
  categories,
  regions,
  statusOptions,
  sortOptions,
}: {
  categories: FilterOption[];
  regions: FilterOption[];
  statusOptions: FilterOption[] | null;
  sortOptions: FilterOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <div className="mt-8 flex flex-wrap items-center gap-2">
      <form
        className="relative min-w-[220px] flex-1"
        onSubmit={(e) => {
          e.preventDefault();
          const q = String(new FormData(e.currentTarget).get("q") ?? "").trim();
          setParam("q", q);
        }}
      >
        <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          name="q"
          defaultValue={params.get("q") ?? ""}
          placeholder="제목·업체명으로 검색"
          className="w-full rounded-full border border-border bg-background py-2.5 pl-11 pr-4 text-sm outline-none"
        />
      </form>
      <FilterSelect
        ariaLabel="업종 필터"
        value={params.get("category") ?? ""}
        options={[{ value: "", label: "업종 전체" }, ...categories]}
        onChange={(v) => setParam("category", v)}
      />
      <FilterSelect
        ariaLabel="지역 필터"
        value={params.get("region") ?? ""}
        options={[{ value: "", label: "지역 전체" }, ...regions]}
        onChange={(v) => setParam("region", v)}
      />
      {statusOptions && (
        <FilterSelect
          ariaLabel="상태 필터"
          value={params.get("status") ?? ""}
          options={statusOptions}
          onChange={(v) => setParam("status", v)}
        />
      )}
      <FilterSelect
        ariaLabel="정렬"
        value={params.get("sort") ?? ""}
        options={sortOptions}
        onChange={(v) => setParam("sort", v)}
      />
    </div>
  );
}
