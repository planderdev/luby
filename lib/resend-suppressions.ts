import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Resend 차단 목록(suppressions) → public.email_suppressions 동기화.
 *
 * Resend 는 하드 바운스·스팸 신고 주소를 팀 전체 차단 목록에 넣고, 그 주소로 가는 메일을 'suppressed' 로 버린다.
 * 2026-10-11 점검에서 8/21 일괄 등록 광고주 19명이 없는 지메일 주소라 어떤 알림도 받지 못하고 있었다 —
 * DB 에 미러를 두고 ① 발송 전 건너뛰기 ② 운영자 회원 관리 '메일 반송' 표시 ③ 연락 불가 광고주 알림 대신 전달에 쓴다.
 *
 * 차단 목록은 Resend 팀 단위라 다른 프로젝트(JGCF) 주소도 섞여 들어오지만, 회원 이메일과 매칭될 때만 의미가 있다.
 */
type ResendSuppression = { id: string; email: string; origin: string; created_at: string };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchAll(apiKey: string): Promise<ResendSuppression[]> {
  const out: ResendSuppression[] = [];
  let after: string | null = null;
  for (let page = 0; page < 50; page++) {
    const url = new URL("https://api.resend.com/suppressions");
    url.searchParams.set("limit", "100");
    if (after) url.searchParams.set("after", after);
    let res: Response | null = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      res = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` }, cache: "no-store" });
      if (res.status !== 429) break;
      await sleep(1200 * (attempt + 1)); // Resend 초당 2회 제한
    }
    if (!res || !res.ok) throw new Error(`resend suppressions ${res?.status ?? "no response"}`);
    const j = (await res.json()) as { data?: ResendSuppression[]; has_more?: boolean };
    const rows = j.data ?? [];
    out.push(...rows);
    if (!j.has_more || rows.length === 0) break;
    after = rows[rows.length - 1].id;
    await sleep(600);
  }
  return out;
}

export async function syncResendSuppressions(
  admin: SupabaseClient,
  apiKey: string | undefined,
): Promise<{ total: number; upserted: number; removed: number; keptBecauseEmpty?: boolean }> {
  if (!apiKey) throw new Error("RESEND_API_KEY missing");
  const list = await fetchAll(apiKey);
  const now = new Date().toISOString();
  const byEmail = new Map<string, { email: string; origin: string; resend_id: string; suppressed_at: string; synced_at: string }>();
  for (const s of list) {
    const email = String(s.email ?? "").trim().toLowerCase();
    if (!email.includes("@")) continue;
    byEmail.set(email, { email, origin: s.origin ?? "unknown", resend_id: s.id, suppressed_at: s.created_at, synced_at: now });
  }
  const rows = [...byEmail.values()];

  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await admin.from("email_suppressions").upsert(rows.slice(i, i + 500), { onConflict: "email" });
    if (error) throw new Error(`upsert email_suppressions: ${error.message}`);
  }

  // Resend 에서 빠진 주소(수동 해제 등)는 미러에서도 지운다. 단, 응답이 비었는데 기존 행이 여럿이면 API 이상일 수 있어 지우지 않는다.
  const { data: existing, error: selErr } = await admin.from("email_suppressions").select("email");
  if (selErr) throw new Error(`select email_suppressions: ${selErr.message}`);
  const stale = (existing ?? []).map((r: { email: string }) => r.email).filter((e) => !byEmail.has(e));
  if (rows.length === 0 && stale.length > 5) {
    return { total: 0, upserted: 0, removed: 0, keptBecauseEmpty: true };
  }
  for (let i = 0; i < stale.length; i += 200) {
    const { error } = await admin.from("email_suppressions").delete().in("email", stale.slice(i, i + 200));
    if (error) throw new Error(`delete email_suppressions: ${error.message}`);
  }
  return { total: list.length, upserted: rows.length, removed: stale.length };
}

/** 발송 직전 확인용. 조회 실패는 '차단 아님'으로 본다(메일을 못 보내는 쪽보다 한 통 버려지는 쪽이 낫다). */
export async function getSuppression(admin: SupabaseClient, email: string): Promise<{ origin: string } | null> {
  const { data, error } = await admin.from("email_suppressions").select("origin").eq("email", email.trim().toLowerCase()).maybeSingle();
  if (error || !data) return null;
  return { origin: (data as { origin: string }).origin };
}
