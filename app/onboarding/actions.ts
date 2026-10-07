"use server";

import { revalidatePath } from "next/cache";
import { dbErrorMessage } from "@/lib/db-errors";
import { createClient } from "@/lib/supabase/server";
import { authDict } from "@/lib/i18n/app/auth";
import type { Locale } from "@/lib/i18n/config";

/** OAuth 가입자 역할 확정 — complete_onboarding() (본인·1회) */
export async function completeOnboarding(input: {
  role: "advertiser" | "influencer";
  name?: string;
  companyName?: string;
  businessNumber?: string;
  advertiserKind?: "brand" | "agency";
  regionId?: string | null;
  refId?: string | null;
  locale?: Locale;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const t = authDict[input.locale ?? "ko"].onboarding;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: t.needLogin };
  if (input.role === "advertiser") {
    const d = (input.businessNumber ?? "").replace(/-/g, "");
    if (!/^\d{10}$/.test(d)) return { ok: false, error: t.errBusinessNumber };
    input.businessNumber = `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
    if (!input.companyName?.trim()) return { ok: false, error: t.errCompany };
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
  if (error) return { ok: false, error: input.locale && input.locale !== "ko" ? t.saveFailed : dbErrorMessage(error) };
  // 화면 언어를 프로필에 남긴다(소셜 가입자는 가입 메타데이터에 locale 이 없다)
  if (input.locale) await supabase.from("profiles").update({ locale: input.locale }).eq("id", user.id);
  revalidatePath("/dashboard");
  return { ok: true };
}
