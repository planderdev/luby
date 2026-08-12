"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function requestWithdrawal(input: {
  amount: number;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const amount = Math.floor(Number(input.amount));
  if (!Number.isFinite(amount) || amount < 10000) {
    return { ok: false, error: "최소 출금 금액은 10,000P입니다." };
  }

  // 잔액 검증·차감·신청 생성은 DB 함수가 한 트랜잭션으로 처리 (이중지출 방지)
  const { error } = await supabase.rpc("request_point_withdrawal", {
    p_amount: amount,
    p_bank_name: input.bankName.trim().slice(0, 50),
    p_account_number: input.accountNumber.trim().slice(0, 50),
    p_account_holder: input.accountHolder.trim().slice(0, 50),
  });

  if (error) {
    // 함수의 raise exception 메시지를 그대로 사용자에게 전달 (한국어)
    const msg = error.message.replace(/^.*?: /, "");
    return { ok: false, error: msg || "출금 신청에 실패했습니다." };
  }

  revalidatePath("/dashboard/points");
  return { ok: true };
}
