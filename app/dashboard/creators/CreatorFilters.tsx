"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

type Opt = { value: string; label: string };

function Select({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: string;
  options: Opt[];
  onChange: (v: string) => void;
  ariaLabel: string;
}) {
  return (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-full border border-border bg-background px-4 py-2.5 text-sm outline-none"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

const FOLLOWER_OPTIONS: Opt[] = [
  { value: "", label: "팔로워 전체" },
  { value: "1000", label: "1천+" },
  { value: "10000", label: "1만+" },
  { value: "50000", label: "5만+" },
  { value: "100000", label: "10만+" },
];

const SORT_OPTIONS: Opt[] = [
  { value: "followers", label: "팔로워 많은순" },
  { value: "completed", label: "체험 완료 많은순" },
  { value: "recent", label: "최근 가입순" },
];

export function CreatorFilters({
  categories,
  regions,
  channels,
}: {
  categories: Opt[];
  regions: Opt[];
  channels: Opt[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page"); // 필터 바뀌면 1페이지로
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <div className="mt-8 flex flex-wrap items-center gap-2">
      <form
        className="relative min-w-[220px] flex-1"
        onSubmit={(e) => {
          e.preventDefault();
          setParam("q", String(new FormData(e.currentTarget).get("q") ?? "").trim());
        }}
      >
        <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          name="q"
          defaultValue={params.get("q") ?? ""}
          placeholder="이름·소개로 검색"
          className="w-full rounded-full border border-border bg-background py-2.5 pl-11 pr-4 text-sm outline-none"
        />
      </form>
      <Select
        ariaLabel="업종"
        value={params.get("category") ?? ""}
        options={[{ value: "", label: "업종 전체" }, ...categories]}
        onChange={(v) => setParam("category", v)}
      />
      <Select
        ariaLabel="지역"
        value={params.get("region") ?? ""}
        options={[{ value: "", label: "지역 전체" }, ...regions]}
        onChange={(v) => setParam("region", v)}
      />
      <Select
        ariaLabel="채널"
        value={params.get("channel") ?? ""}
        options={[{ value: "", label: "채널 전체" }, ...channels]}
        onChange={(v) => setParam("channel", v)}
      />
      <Select
        ariaLabel="팔로워"
        value={params.get("followers") ?? ""}
        options={FOLLOWER_OPTIONS}
        onChange={(v) => setParam("followers", v)}
      />
      <Select
        ariaLabel="정렬"
        value={params.get("sort") ?? "followers"}
        options={SORT_OPTIONS}
        onChange={(v) => setParam("sort", v)}
      />
    </div>
  );
}
