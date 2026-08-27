"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { dbErrorMessage } from "@/lib/db-errors";

type Result = { ok: true } | { ok: false; error: string };

async function ensureOperator() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "로그인이 필요합니다." };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "operator") return { ok: false as const, error: "운영자만 사용할 수 있습니다." };
  return { ok: true as const, supabase, user };
}

/** datetime-local 값은 캠페인 빌더와 동일하게 UTC 로 해석한다 */
function toIso(v: string | null | undefined): string | null {
  const raw = (v ?? "").trim();
  if (!raw) return null;
  const d = new Date(raw.length === 16 ? `${raw}:00Z` : raw);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function validate(input: NoticeInput): string | null {
  if (!input.title.trim()) return "제목을 입력해주세요. 목록에서 구분하는 이름이자 이미지 대체 텍스트로 쓰입니다.";
  if (input.title.trim().length > 120) return "제목은 120자까지 입력할 수 있어요.";
  if (!input.imageUrl.trim()) return "팝업 이미지를 올려주세요.";
  const link = input.linkUrl?.trim();
  if (link && !/^https?:\/\//i.test(link)) return "링크는 https:// 로 시작해야 해요.";
  const starts = toIso(input.startsAt);
  const ends = toIso(input.endsAt);
  if (input.startsAt && !starts) return "노출 시작 일시가 올바르지 않습니다.";
  if (input.endsAt && !ends) return "노출 종료 일시가 올바르지 않습니다.";
  if (starts && ends && new Date(ends) <= new Date(starts)) return "종료 일시는 시작 일시보다 뒤여야 해요.";
  return null;
}

export type NoticeInput = {
  title: string;
  imageUrl: string;
  linkUrl?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  sortOrder?: number;
  active?: boolean;
};

export async function createNotice(input: NoticeInput): Promise<Result> {
  const guard = await ensureOperator();
  if (!guard.ok) return guard;
  const invalid = validate(input);
  if (invalid) return { ok: false, error: invalid };

  const { error } = await guard.supabase.from("notice_popups").insert({
    title: input.title.trim(),
    image_url: input.imageUrl.trim(),
    link_url: input.linkUrl?.trim() || null,
    starts_at: toIso(input.startsAt) ?? new Date().toISOString(),
    ends_at: toIso(input.endsAt),
    sort_order: Number.isFinite(input.sortOrder) ? Number(input.sortOrder) : 0,
    active: input.active ?? true,
    created_by: guard.user.id,
  });
  if (error) return { ok: false, error: dbErrorMessage(error) };

  revalidatePath("/dashboard/operator/notices");
  return { ok: true };
}

export async function updateNotice(id: string, input: NoticeInput): Promise<Result> {
  const guard = await ensureOperator();
  if (!guard.ok) return guard;
  const invalid = validate(input);
  if (invalid) return { ok: false, error: invalid };

  const { error } = await guard.supabase
    .from("notice_popups")
    .update({
      title: input.title.trim(),
      image_url: input.imageUrl.trim(),
      link_url: input.linkUrl?.trim() || null,
      starts_at: toIso(input.startsAt) ?? new Date().toISOString(),
      ends_at: toIso(input.endsAt),
      sort_order: Number.isFinite(input.sortOrder) ? Number(input.sortOrder) : 0,
      active: input.active ?? true,
    })
    .eq("id", id);
  if (error) return { ok: false, error: dbErrorMessage(error) };

  revalidatePath("/dashboard/operator/notices");
  return { ok: true };
}

/** 노출 켜고 끄기 (목록에서 바로) */
export async function setNoticeActive(id: string, active: boolean): Promise<Result> {
  const guard = await ensureOperator();
  if (!guard.ok) return guard;
  const { error } = await guard.supabase.from("notice_popups").update({ active }).eq("id", id);
  if (error) return { ok: false, error: dbErrorMessage(error) };
  revalidatePath("/dashboard/operator/notices");
  return { ok: true };
}

export async function deleteNotice(id: string): Promise<Result> {
  const guard = await ensureOperator();
  if (!guard.ok) return guard;
  const { error } = await guard.supabase.from("notice_popups").delete().eq("id", id);
  if (error) return { ok: false, error: dbErrorMessage(error) };
  revalidatePath("/dashboard/operator/notices");
  return { ok: true };
}
