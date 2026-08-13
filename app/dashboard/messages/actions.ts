"use server";

import { createClient } from "@/lib/supabase/server";
import { getEntitlements } from "@/lib/plans/entitlements";

type SendResult =
  | { ok: true; id: string; createdAt: string }
  | { ok: false; error: string };

export async function sendMessage(applicationId: string, body: string): Promise<SendResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const text = body.trim();
  if (!text) return { ok: false, error: "메시지를 입력해주세요." };
  if (text.length > 2000) return { ok: false, error: "메시지는 2,000자 이내로 입력해주세요." };

  // 광고주 발신은 BUSINESS 이상 — RLS도 차단하지만, 친절한 안내를 위해 먼저 확인
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role === "advertiser") {
    const ent = await getEntitlements(user.id);
    if (ent.tier === "free") {
      return { ok: false, error: "전용 채팅은 BUSINESS 플랜부터 이용할 수 있어요." };
    }
  }

  const { data, error } = await supabase
    .from("messages")
    .insert({ application_id: applicationId, sender_id: user.id, body: text })
    .select("id, created_at")
    .single();
  if (error) {
    return { ok: false, error: "메시지를 보낼 수 없습니다. 선정된 체험단과의 대화만 가능해요." };
  }
  return { ok: true, id: data.id, createdAt: data.created_at };
}

export async function markThreadRead(applicationId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.rpc("mark_thread_read", { p_application_id: applicationId });
}
