"use server";

import { revalidatePath } from "next/cache";
import { dbErrorMessage } from "@/lib/db-errors";
import { createClient } from "@/lib/supabase/server";

/** OAuth 가입자 역할 확정 — complete_onboarding() (본인·1회) */
export async function completeOnboarding(input: {
  role: "advertiser" | "influencer";
  name?: string;
  companyName?: string;
  businessNumber?: string;
  advertiserKind?: "brand" | "agency";
  regionId?: string | null;
  refId?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  if (input.role === "advertiser") {
    const d = (input.businessNumber ?? "").replace(/-/g, "");
    if (!/^\d{10}$/.test(d)) return { ok: false, error: "사업자등록번호는 숫자 10자리로 입력해주세요." };
    input.businessNumber = `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
    if (!input.companyName?.trim()) return { ok: false, error: "회사·상호명을 입력해주세요." };
  }
  const { error } = await supabase.rpc("complete_onboarding", {
    p_role: input.role,
    p_name: input.name ?? null,
    p_company_name: input.companyName ?? null,
    p_business_number: input.businessNumber ?? null,
    p_advertiser_kind: input.advertiserKind ?? "brand",
    p_region_id: input.regionId ?? null,
    p_referred_by: input.refId && /^[0-9a-f-]{36}$/.test(input.refId) ? input.refId : null,
  });
  if (error) return { ok: false, error: dbErrorMessage(error) };
  revalidatePath("/dashboard");
  return { ok: true };
}
