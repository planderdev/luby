"use server";
import { channelHint, urlMatchesChannel } from "@/lib/channel-hints";
import { dbErrorMessage, dbErrorWith } from "@/lib/db-errors";
import { dashboardDict } from "@/lib/i18n/app/dashboard";
import type { Locale } from "@/lib/i18n/config";

const E = (l: Locale) => dashboardDict[l].settings.errors;

import { revalidatePath } from "next/cache";
import { revalidatePublicCreator } from "@/lib/cache/public-revalidate";
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
  // 세금계산서·청구 정보
  representative_name?: string | null;
  business_address?: string | null;
  tax_email?: string | null;
};

export async function updateProfile(
  payload: SettingsPayload
, locale: Locale = "ko"): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: E(locale).needLogin };

  // Update profiles.name + avatar_url
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      name: payload.name.trim(),
      avatar_url: payload.avatar_url || null,
    })
    .eq("id", user.id);

  if (profileError) return { ok: false, error: locale === "ko" ? dbErrorWith("프로필 저장 실패", profileError) : E(locale).saveFailed };

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
    if (infError) return { ok: false, error: locale === "ko" ? dbErrorWith("인플루언서 정보 저장 실패", infError) : E(locale).saveFailed };
  }

  if (profile?.role === "advertiser") {
    const website = payload.website?.trim() || null;
    if (website && !/^(https?:\/\/)?[\w.-]+\.[a-z]{2,}(\/\S*)?$/i.test(website)) {
      return { ok: false, error: "웹사이트 주소 형식이 올바르지 않습니다." };
    }
    const taxEmail = payload.tax_email?.trim();
    if (taxEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(taxEmail)) {
      return { ok: false, error: "세금계산서 수신 이메일 형식이 올바르지 않습니다." };
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
        representative_name: payload.representative_name?.trim().slice(0, 60) || null,
        business_address: payload.business_address?.trim().slice(0, 200) || null,
        tax_email: payload.tax_email?.trim().toLowerCase().slice(0, 120) || null,
      })
      .eq("profile_id", user.id);
    if (advError) return { ok: false, error: dbErrorWith("회사 정보 저장 실패", advError) };
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  revalidatePublicCreator(user.id); // 이름·소개·지역이 공개 프로필에 바로 반영되게
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

export async function addChannel(payload: ChannelPayload, locale: Locale = "ko"): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: E(locale).needLogin };

  const url = payload.url.trim();
  if (!url) return { ok: false, error: E(locale).urlRequired };
  if (!payload.channel_type_id) return { ok: false, error: E(locale).typeRequired };
  if (!/^https?:\/\//i.test(url)) return { ok: false, error: E(locale).https };
  const { data: ct } = await supabase.from("channel_types").select("slug, name").eq("id", payload.channel_type_id).maybeSingle();
  if (!ct) return { ok: false, error: E(locale).typeInvalid };
  if (!urlMatchesChannel(url, ct.slug)) {
    const h = channelHint(ct.slug);
    return { ok: false, error: E(locale).domain(ct.name, h.urlPlaceholder) };
  }

  const { data: inserted, error } = await supabase
    .from("influencer_channels")
    .insert({
      influencer_id: user.id,
      channel_type_id: payload.channel_type_id,
      url,
      handle: payload.handle?.trim() || null,
      followers: Math.max(0, payload.followers || 0),
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: locale === "ko" ? dbErrorWith("채널 추가 실패", error) : E(locale).addFailed };
  // 유튜브: 키가 있으면 구독자·조회수·영상 수를 공개 통계로 바로 채운다(본인 인증은 별도). 실패해도 채널 추가는 그대로
  if (ct.slug === "youtube" && inserted) await refreshYouTubeStats(inserted.id, url).catch(() => undefined);

  revalidatePath("/dashboard/settings");
  revalidatePublicCreator(user.id);
  return { ok: true };
}

export async function deleteChannel(channelId: string, locale: Locale = "ko"): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: E(locale).needLogin };

  // RLS(influencer_channels_self_write)가 본인 채널만 삭제되도록 보장하지만
  // 명시적으로도 influencer_id를 걸어 방어.
  const { error } = await supabase
    .from("influencer_channels")
    .delete()
    .eq("id", channelId)
    .eq("influencer_id", user.id);
  if (error) return { ok: false, error: locale === "ko" ? dbErrorWith("채널 삭제 실패", error) : E(locale).deleteFailed };

  revalidatePath("/dashboard/settings");
  revalidatePublicCreator(user.id);
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
  if (error) return { ok: false, error: dbErrorWith("팔로워 수 저장 실패", error) };

  revalidatePath("/dashboard/settings");
  revalidatePublicCreator(user.id);
  return { ok: true };
}

/** 크리에이터 전문 분야 저장 (최대 3개, 전체 교체) */
export async function setMyCategories(categoryIds: string[], locale: Locale = "ko"): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: E(locale).needLogin };

  const ids = [...new Set(categoryIds)].slice(0, 3);
  const { error } = await supabase.rpc("set_my_categories", { p_category_ids: ids });
  if (error) return { ok: false, error: locale === "ko" ? dbErrorMessage(error) : E(locale).saveFailed };
  revalidatePath("/dashboard/settings");
  revalidatePublicCreator(user.id);
  return { ok: true };
}

/** 이메일 알림 수신 설정 저장 (인앱 알림은 영향 없음) */
export async function updateEmailPrefs(prefs: {
  transactional: boolean;
  reminders: boolean;
  digest: boolean;
}, locale: Locale = "ko"): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: E(locale).needLogin };
  const clean = { transactional: !!prefs.transactional, reminders: !!prefs.reminders, digest: !!prefs.digest };
  const { error } = await supabase.from("profiles").update({ email_prefs: clean }).eq("id", user.id);
  if (error) return { ok: false, error: locale === "ko" ? dbErrorWith("저장 실패", error) : E(locale).saveFailed };
  revalidatePath("/dashboard/settings");
  return { ok: true };
}

/** 크리에이터: 공개 프로필 켜기/끄기 (옵트인) */
export async function setPublicProfile(enabled: boolean, locale: Locale = "ko"): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: E(locale).needLogin };
  const { error } = await supabase.from("influencers").update({ public_profile: !!enabled }).eq("profile_id", user.id);
  if (error) return { ok: false, error: locale === "ko" ? dbErrorWith("저장 실패", error) : E(locale).saveFailed };
  revalidatePath("/dashboard/settings");
  revalidatePublicCreator(user.id); // 껐다면 공개 프로필이 즉시 닫혀야 한다
  return { ok: true };
}

/** 웹 푸시 구독 저장 (브라우저/기기별 endpoint 로 upsert) */
export async function savePushSubscription(sub: { endpoint: string; p256dh: string; auth: string }, userAgent?: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  if (!sub.endpoint?.startsWith("https://") || !sub.p256dh || !sub.auth) return { ok: false, error: "구독 정보가 올바르지 않습니다." };
  const { error } = await supabase.from("push_subscriptions").upsert(
    { user_id: user.id, endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth, user_agent: userAgent?.slice(0, 200) ?? null, last_seen_at: new Date().toISOString(), failed_count: 0 },
    { onConflict: "endpoint" }
  );
  if (error) return { ok: false, error: "구독을 저장하지 못했습니다." };
  return { ok: true };
}

/** 웹 푸시 구독 해제 (endpoint 지정 없으면 내 구독 전부) */
export async function removePushSubscription(endpoint?: string | null): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  let q = supabase.from("push_subscriptions").delete().eq("user_id", user.id);
  if (endpoint) q = q.eq("endpoint", endpoint);
  const { error } = await q;
  if (error) return { ok: false, error: "구독을 해제하지 못했습니다." };
  return { ok: true };
}

/** 내 푸시 구독 수 (설정 화면 표시용) */
export async function countPushSubscriptions(): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;
  const { count } = await supabase.from("push_subscriptions").select("id", { count: "exact", head: true }).eq("user_id", user.id);
  return count ?? 0;
}

// ---------- 채널 본인 인증(2026-10-24) — 흐름은 lib/channels/verify.ts ----------
// 신뢰 칸(verified·verify_*·stats_*)은 DB 트리거가 크리에이터 쓰기를 막으므로 확인을 마친 뒤 service_role 로 쓴다.
// 서버 전용 모듈은 동적 import(렌더 시험이 이 파일을 불러올 때 깨지지 않게).

type VerifyStart = { ok: true; code: string; auto: boolean } | { ok: false; error: string };

async function myChannel(channelId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("influencer_channels")
    .select("id, url, handle, verify_code, verify_status, channel_types(slug, name)")
    .eq("id", channelId)
    .eq("influencer_id", user.id)
    .maybeSingle();
  if (!data) return null;
  const type = data.channel_types as unknown as { slug: string; name: string } | null;
  return { user, ch: data, slug: type?.slug ?? "", typeName: type?.name ?? "" };
}

async function refreshYouTubeStats(channelId: string, url: string) {
  const [{ getAdminSupabase }, { fetchYouTubeChannel }] = await Promise.all([import("@/lib/supabase/admin"), import("@/lib/channels/youtube")]);
  const r = await fetchYouTubeChannel(url);
  if (!r.ok) return r;
  const c = r.channel;
  await getAdminSupabase()
    .from("influencer_channels")
    .update({
      ...(c.subscribers !== null ? { followers: c.subscribers } : {}),
      stats: { subscribers: c.subscribers, views: c.views, videos: c.videos, title: c.title },
      stats_source: "api",
      stats_updated_at: new Date().toISOString(),
      external_id: c.id,
    })
    .eq("id", channelId);
  return r;
}

/** 인증 시작 — 채널별 코드(처음 한 번 만들고 계속 같은 코드)와 자동 확인 가능 여부 */
export async function startChannelVerification(channelId: string, locale: Locale = "ko"): Promise<VerifyStart> {
  const v = dashboardDict[locale].settings.channels.verify;
  const own = await myChannel(channelId);
  if (!own) return { ok: false, error: v.errNotOwner };
  const [{ getAdminSupabase }, { youtubeConfigured }, { generateVerifyCode }] = await Promise.all([
    import("@/lib/supabase/admin"),
    import("@/lib/channels/youtube"),
    import("@/lib/channels/verify"),
  ]);
  let code = own.ch.verify_code;
  if (!code) {
    code = generateVerifyCode();
    const { error } = await getAdminSupabase().from("influencer_channels").update({ verify_code: code }).eq("id", channelId).is("verify_code", null);
    if (error) return { ok: false, error: v.errFailed };
    // 동시에 두 번 눌렀으면 먼저 저장된 코드를 쓴다
    const { data } = await getAdminSupabase().from("influencer_channels").select("verify_code").eq("id", channelId).single();
    code = data?.verify_code ?? code;
  }
  return { ok: true, code, auto: own.slug === "youtube" && youtubeConfigured() };
}

/** 유튜브 자동 확인 — 채널 설명에 코드가 있으면 바로 인증 + 구독자 수 반영 */
export async function checkYouTubeVerification(channelId: string, locale: Locale = "ko"): Promise<ActionResult> {
  const v = dashboardDict[locale].settings.channels.verify;
  const own = await myChannel(channelId);
  if (!own) return { ok: false, error: v.errNotOwner };
  if (own.slug !== "youtube") return { ok: false, error: v.errFailed };
  if (!own.ch.verify_code) return { ok: false, error: v.errNoCode };
  const [{ getAdminSupabase }, { fetchYouTubeChannel }, { codeInText }] = await Promise.all([
    import("@/lib/supabase/admin"),
    import("@/lib/channels/youtube"),
    import("@/lib/channels/verify"),
  ]);
  const r = await fetchYouTubeChannel(own.ch.url);
  if (!r.ok) return { ok: false, error: r.error === "unsupported_url" ? v.errYtUrl : r.error === "not_found" ? v.errYtNotFound : v.errFailed };
  if (!codeInText(r.channel.description, own.ch.verify_code)) return { ok: false, error: v.errCodeNotFound };
  const c = r.channel;
  const now = new Date().toISOString();
  const { error } = await getAdminSupabase()
    .from("influencer_channels")
    .update({
      verified: true,
      verify_status: "verified",
      verify_method: "youtube_api",
      verified_at: now,
      verified_by: null,
      verify_note: null,
      proof_path: null,
      ...(c.subscribers !== null ? { followers: c.subscribers } : {}),
      stats: { subscribers: c.subscribers, views: c.views, videos: c.videos, title: c.title },
      stats_source: "api",
      stats_updated_at: now,
      external_id: c.id,
    })
    .eq("id", channelId);
  if (error) return { ok: false, error: v.errFailed };
  revalidatePath("/dashboard/settings");
  revalidatePublicCreator(own.user.id);
  return { ok: true };
}

/** 캡처로 인증 요청 — 운영자가 코드·팔로워를 확인한다. 운영자(데모 제외)에게 알림 */
export async function requestChannelVerification(
  channelId: string,
  input: { proofPath: string; followers: number },
  locale: Locale = "ko",
): Promise<ActionResult> {
  const v = dashboardDict[locale].settings.channels.verify;
  const own = await myChannel(channelId);
  if (!own) return { ok: false, error: v.errNotOwner };
  if (!own.ch.verify_code) return { ok: false, error: v.errNoCode };
  const [{ getAdminSupabase }, { isOwnProofPath }] = await Promise.all([import("@/lib/supabase/admin"), import("@/lib/channels/verify")]);
  if (!input.proofPath || !isOwnProofPath(input.proofPath, own.user.id)) return { ok: false, error: v.errProof };
  const followers = Math.min(2_000_000_000, Math.max(0, Math.floor(Number(input.followers) || 0)));
  const admin = getAdminSupabase();
  const { error } = await admin
    .from("influencer_channels")
    .update({ verify_status: "pending", verify_requested_at: new Date().toISOString(), proof_path: input.proofPath, followers, stats_source: "self", verify_note: null })
    .eq("id", channelId)
    .neq("verify_status", "verified");
  if (error) return { ok: false, error: v.errFailed };

  const { data: me } = await admin.from("profiles").select("name, is_demo").eq("id", own.user.id).single();
  if (me && !me.is_demo) {
    const { data: ops } = await admin.from("profiles").select("id").eq("role", "operator").eq("approved", true).eq("is_demo", false);
    if (ops?.length) {
      await admin.from("notifications").insert(
        ops.map((o) => ({
          user_id: o.id,
          type: "channel_verify_request",
          title: `채널 인증 요청 — ${me.name ?? "크리에이터"}`,
          body: `${own.typeName} ${own.ch.handle || own.ch.url} · 팔로워 ${followers.toLocaleString("ko-KR")} 신고. 캡처에서 인증 코드와 팔로워 수를 확인해 주세요.`,
          link: "/dashboard/operator/users#channel-verify",
        })),
      );
    }
  }
  revalidatePath("/dashboard/settings");
  return { ok: true };
}
