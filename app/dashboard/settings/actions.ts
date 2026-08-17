"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type SettingsPayload = {
  name: string;
  avatar_url: string | null;
  bio?: string | null;
  region_id?: string | null;
  // 광고주 공개 프로필
  company_name?: string | null;
  advertiser_kind?: "brand" | "agency" | null;
  description?: string | null;
  website?: string | null;
  category_id?: string | null;
};

export async function updateProfile(
  payload: SettingsPayload
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  // Update profiles.name + avatar_url
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      name: payload.name.trim(),
      avatar_url: payload.avatar_url || null,
    })
    .eq("id", user.id);

  if (profileError) return { ok: false, error: `프로필 저장 실패: ${profileError.message}` };

  // If influencer, also update influencers row
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role === "influencer") {
    const { error: infError } = await supabase
      .from("influencers")
      .update({
        bio: payload.bio?.trim() || null,
        region_id: payload.region_id || null,
      })
      .eq("profile_id", user.id);
    if (infError) return { ok: false, error: `인플루언서 정보 저장 실패: ${infError.message}` };
  }

  if (profile?.role === "advertiser") {
    const website = payload.website?.trim() || null;
    if (website && !/^(https?:\/\/)?[\w.-]+\.[a-z]{2,}(\/\S*)?$/i.test(website)) {
      return { ok: false, error: "웹사이트 주소 형식이 올바르지 않습니다." };
    }
    const { error: advError } = await supabase
      .from("advertisers")
      .update({
        ...(payload.company_name?.trim() ? { company_name: payload.company_name.trim() } : {}),
        ...(payload.advertiser_kind === "brand" || payload.advertiser_kind === "agency"
          ? { advertiser_kind: payload.advertiser_kind }
          : {}),
        description: payload.description?.trim().slice(0, 600) || null,
        website: website?.slice(0, 200) ?? null,
        category_id: payload.category_id || null,
      })
      .eq("profile_id", user.id);
    if (advError) return { ok: false, error: `회사 정보 저장 실패: ${advError.message}` };
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  return { ok: true };
}

// ---------- Influencer SNS channel management ----------

export type ChannelPayload = {
  channel_type_id: string;
  url: string;
  handle: string | null;
  followers: number;
};

type ActionResult = { ok: true } | { ok: false; error: string };

export async function addChannel(payload: ChannelPayload): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const url = payload.url.trim();
  if (!url) return { ok: false, error: "채널 URL을 입력해주세요." };
  if (!payload.channel_type_id) return { ok: false, error: "채널 종류를 선택해주세요." };

  const { error } = await supabase.from("influencer_channels").insert({
    influencer_id: user.id,
    channel_type_id: payload.channel_type_id,
    url,
    handle: payload.handle?.trim() || null,
    followers: Math.max(0, payload.followers || 0),
  });
  if (error) return { ok: false, error: `채널 추가 실패: ${error.message}` };

  revalidatePath("/dashboard/settings");
  return { ok: true };
}

export async function deleteChannel(channelId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  // RLS(influencer_channels_self_write)가 본인 채널만 삭제되도록 보장하지만
  // 명시적으로도 influencer_id를 걸어 방어.
  const { error } = await supabase
    .from("influencer_channels")
    .delete()
    .eq("id", channelId)
    .eq("influencer_id", user.id);
  if (error) return { ok: false, error: `채널 삭제 실패: ${error.message}` };

  revalidatePath("/dashboard/settings");
  return { ok: true };
}

export async function updateChannelFollowers(
  channelId: string,
  followers: number
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { error } = await supabase
    .from("influencer_channels")
    .update({ followers: Math.max(0, followers || 0) })
    .eq("id", channelId)
    .eq("influencer_id", user.id);
  if (error) return { ok: false, error: `팔로워 수 저장 실패: ${error.message}` };

  revalidatePath("/dashboard/settings");
  return { ok: true };
}

/** 크리에이터 전문 분야 저장 (최대 3개, 전체 교체) */
export async function setMyCategories(categoryIds: string[]): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const ids = [...new Set(categoryIds)].slice(0, 3);
  const { error } = await supabase.rpc("set_my_categories", { p_category_ids: ids });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/settings");
  return { ok: true };
}
