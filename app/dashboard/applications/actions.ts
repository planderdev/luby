"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function normalizeUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withProtocol);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

// 선정된 인플루언서의 발행 콘텐츠 제출.
// application당 1행 — 수정 요청을 받은 경우에만 같은 행을 갱신해 재제출한다.
// (RLS: insert는 본인+selected 응모만, update는 revision_requested → submitted 경로만 허용)
export async function submitContent(
  applicationId: string,
  contentUrl: string,
  note: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const url = normalizeUrl(contentUrl);
  if (!url) return { ok: false, error: "올바른 콘텐츠 링크(URL)를 입력해주세요." };

  const trimmedNote = note.trim().slice(0, 1000) || null;

  const { data: existing } = await supabase
    .from("submissions")
    .select("id, status")
    .eq("application_id", applicationId)
    .maybeSingle();

  if (existing) {
    if (existing.status !== "revision_requested") {
      return { ok: false, error: "이미 제출된 콘텐츠입니다. 검수 결과를 기다려주세요." };
    }
    const { error } = await supabase
      .from("submissions")
      .update({
        content_url: url,
        note: trimmedNote,
        status: "submitted",
        submitted_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    if (error) return { ok: false, error: "재제출에 실패했습니다. 잠시 후 다시 시도해주세요." };
  } else {
    const { error } = await supabase.from("submissions").insert({
      application_id: applicationId,
      content_url: url,
      note: trimmedNote,
    });
    if (error) {
      if (error.code === "23505") {
        return { ok: false, error: "이미 제출된 콘텐츠입니다." };
      }
      return { ok: false, error: "제출에 실패했습니다. 선정된 응모인지 확인해주세요." };
    }
  }

  revalidatePath("/dashboard/applications");
  return { ok: true };
}
