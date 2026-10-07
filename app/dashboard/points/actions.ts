"use server";

import { revalidatePath } from "next/cache";
import { dbErrorMessage } from "@/lib/db-errors";
import { createClient } from "@/lib/supabase/server";
import { dashboardDict } from "@/lib/i18n/app/dashboard";
import type { Locale } from "@/lib/i18n/config";

export async function requestWithdrawal(input: {
  amount: number;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
}, locale: Locale = "ko"): Promise<{ ok: true } | { ok: false; error: string }> {
  const t = dashboardDict[locale].points.form;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: locale === "ko" ? "로그인이 필요합니다." : dashboardDict[locale].settings.errors.needLogin };

  const amount = Math.floor(Number(input.amount));
  if (!Number.isFinite(amount) || amount < 10000) {
    return { ok: false, error: t.errMin };
  }

  // 잔액 검증·차감·신청 생성은 DB 함수가 한 트랜잭션으로 처리 (이중지출 방지)
  const { error } = await supabase.rpc("request_point_withdrawal", {
    p_amount: amount,
    p_bank_name: input.bankName.trim().slice(0, 50),
    p_account_number: input.accountNumber.trim().slice(0, 50),
    p_account_holder: input.accountHolder.trim().slice(0, 50),
  });

  if (error) {
    // 함수의 raise exception 메시지(한국어)는 그대로, 그 외 DB 오류는 한국어로 변환
    return { ok: false, error: locale === "ko" ? dbErrorMessage(error, "출금 신청에 실패했습니다.") : t.errFailed };
  }

  revalidatePath("/dashboard/points");
  return { ok: true };
}
