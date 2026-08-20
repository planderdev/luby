"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { FilterSelect, type FilterOption as Opt } from "@/components/dashboard/FilterSelect";

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
  quickChannels = [],
}: {
  categories: Opt[];
  regions: Opt[];
  channels: Opt[];
  /** 글로벌 채널 퀵필터 (샤오홍슈·더우인·Lemon8) */
  quickChannels?: Opt[];
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

  const activeChannel = params.get("channel") ?? "";
  const publicOnly = params.get("public") === "1";

  return (
    <div className="mt-8">
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[11px] uppercase tracking-wider text-muted-foreground">빠른 필터</span>
          {quickChannels.map((q) => {
            const on = activeChannel === q.value;
            return (
              <button
                key={q.value}
                type="button"
                onClick={() => setParam("channel", on ? "" : q.value)}
                aria-pressed={on}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                  on ? "border-foreground bg-foreground text-background" : "border-border bg-background hover:bg-muted"
                }`}
              >
                {q.label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setParam("public", publicOnly ? "" : "1")}
            aria-pressed={publicOnly}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${
              publicOnly ? "border-foreground bg-foreground text-background" : "border-border bg-background hover:bg-muted"
            }`}
            title="공개 프로필을 켠 크리에이터만 — 팀·클라이언트에 링크 공유 가능"
          >
            공개 프로필 있음
          </button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
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
      <FilterSelect
        ariaLabel="업종"
        value={params.get("category") ?? ""}
        options={[{ value: "", label: "업종 전체" }, ...categories]}
        onChange={(v) => setParam("category", v)}
      />
      <FilterSelect
        ariaLabel="지역"
        value={params.get("region") ?? ""}
        options={[{ value: "", label: "지역 전체" }, ...regions]}
        onChange={(v) => setParam("region", v)}
      />
      <FilterSelect
        ariaLabel="채널"
        value={params.get("channel") ?? ""}
        options={[{ value: "", label: "채널 전체" }, ...channels]}
        onChange={(v) => setParam("channel", v)}
      />
      <FilterSelect
        ariaLabel="팔로워"
        value={params.get("followers") ?? ""}
        options={FOLLOWER_OPTIONS}
        onChange={(v) => setParam("followers", v)}
      />
      <FilterSelect
        ariaLabel="정렬"
        value={params.get("sort") ?? "followers"}
        defaultValue="followers"
        options={SORT_OPTIONS}
        onChange={(v) => setParam("sort", v)}
      />
      </div>
    </div>
  );
}
