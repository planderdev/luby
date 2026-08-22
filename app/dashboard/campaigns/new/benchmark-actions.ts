"use server";

import { createClient } from "@/lib/supabase/server";

export type CategoryBenchmark = {
  scope: "category" | "all";
  sample: number;
  points_median: number | null;
  points_p25: number | null;
  points_p75: number | null;
  recruit_median: number | null;
  ratio_avg: number | null;
  fill_rate: number | null;
  approval_rate: number | null;
  top_channels: string[];
};

/** 같은 분야 최근 180일 캠페인 벤치마크 (표본 <3 이면 전체 기준). 집계만 반환, 개별 캠페인 정보 없음 */
export async function getCategoryBenchmark(categoryId: string | null): Promise<CategoryBenchmark | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.rpc("category_benchmark", { p_category: categoryId && /^[0-9a-f-]{36}$/.test(categoryId) ? categoryId : undefined });
  return (data as CategoryBenchmark | null) ?? null;
}
