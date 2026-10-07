"use server";

import { dashboardDict } from "@/lib/i18n/app/dashboard";
import type { Locale } from "@/lib/i18n/config";

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
  note: string,
  locale: Locale = "ko"
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: dashboardDict[locale].applications.errNeedLogin };

  const url = normalizeUrl(contentUrl);
  if (!url) return { ok: false, error: dashboardDict[locale].applications.errUrl };

  const trimmedNote = note.trim().slice(0, 1000) || null;

  const { data: existing } = await supabase
    .from("submissions")
    .select("id, status")
    .eq("application_id", applicationId)
    .maybeSingle();

  if (existing) {
    if (existing.status !== "revision_requested") {
      return { ok: false, error: dashboardDict[locale].applications.errAlreadySubmitted };
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
    if (error) return { ok: false, error: dashboardDict[locale].applications.errResubmit };
  } else {
    const { error } = await supabase.from("submissions").insert({
      application_id: applicationId,
      content_url: url,
      note: trimmedNote,
    });
    if (error) {
      if (error.code === "23505") {
        return { ok: false, error: dashboardDict[locale].applications.errAlready };
      }
      return { ok: false, error: dashboardDict[locale].applications.errNotSelected };
    }
  }

  revalidatePath("/dashboard/applications");
  return { ok: true };
}
