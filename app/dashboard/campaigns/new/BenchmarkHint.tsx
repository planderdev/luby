"use client";

import { useEffect, useState } from "react";
import { BarChart3 } from "lucide-react";
import { getCategoryBenchmark, type CategoryBenchmark } from "./benchmark-actions";

const cache = new Map<string, Promise<CategoryBenchmark | null>>();

/**
 * 빌더 벤치마크 한 줄 — 같은 분야(표본 3개 미만이면 전체) 최근 180일 캠페인의 포인트 중앙값·모집 인원·경쟁률·승인율.
 * mode=recruit: 모집 인원·경쟁률 중심, mode=points: 포인트 구간 중심. 입력값과 비교해 가벼운 코멘트.
 */
export function BenchmarkHint({ categoryId, mode, value }: { categoryId: string | null; mode: "recruit" | "points"; value: number }) {
  const [b, setB] = useState<CategoryBenchmark | null | undefined>(undefined);
  useEffect(() => {
    const key = categoryId ?? "all";
    if (!cache.has(key)) cache.set(key, getCategoryBenchmark(categoryId).catch(() => null));
    let alive = true;
    cache.get(key)!.then((r) => { if (alive) setB(r); });
    return () => { alive = false; };
  }, [categoryId]);
  if (!b) return null;

  const fmt = (n: number | null) => (n === null ? "-" : Math.round(n).toLocaleString());
  const scopeLabel = b.scope === "category" ? "같은 분야" : "플랫폼 전체";
  let comment: string | null = null;
  if (mode === "points" && b.points_p25 !== null && b.points_p75 !== null && value > 0) {
    if (value < b.points_p25) comment = "평균보다 낮은 편이에요 — 응모가 적으면 포인트를 올려 보세요.";
    else if (value > b.points_p75) comment = "넉넉한 편이에요 — 응모가 몰리면 상위 N명 선정을 활용하세요.";
    else comment = "비슷한 캠페인과 비슷한 수준이에요.";
  }
  if (mode === "recruit" && b.recruit_median !== null && value > 0) {
    if (value > b.recruit_median * 2) comment = "모집 인원이 많은 편이에요 — 경쟁률이 낮으면 마감 연장·포인트 조정을 고려하세요.";
    else if (value < Math.max(1, b.recruit_median / 3)) comment = "소수 정예 모집이에요 — 응모가 몰리면 AI 적합도 평가로 골라보세요.";
  }

  return (
    <div className="mt-2 rounded-xl bg-muted/50 px-3.5 py-2.5 text-xs text-muted-foreground">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="inline-flex items-center gap-1 font-medium text-foreground"><BarChart3 className="size-3.5" /> {scopeLabel} 벤치마크</span>
        {mode === "points" ? (
          <>
            <span>포인트 중앙값 <b className="text-foreground">{fmt(b.points_median)}P</b> (보통 {fmt(b.points_p25)}~{fmt(b.points_p75)}P)</span>
            {b.approval_rate !== null && <span>콘텐츠 승인율 {fmt(b.approval_rate)}%</span>}
          </>
        ) : (
          <>
            <span>모집 인원 중앙값 <b className="text-foreground">{fmt(b.recruit_median)}명</b></span>
            {b.ratio_avg !== null && <span>평균 경쟁률 {b.ratio_avg}:1</span>}
            {b.fill_rate !== null && <span>모집 충원율 {fmt(b.fill_rate)}%</span>}
            {b.top_channels.length > 0 && <span>많이 쓰는 채널 {b.top_channels.join("·")}</span>}
          </>
        )}
        <span className="text-[10px]">최근 180일 · {b.sample}개 캠페인</span>
      </div>
      {comment && <p className="mt-1">{comment}</p>}
    </div>
  );
}
