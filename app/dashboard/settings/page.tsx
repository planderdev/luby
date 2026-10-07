import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "./SettingsForm";
import { EmailPrefsForm } from "./EmailPrefsForm";
import { PushToggle } from "./PushToggle";
import { countPushSubscriptions } from "./actions";
import { PublicProfileToggle } from "./PublicProfileToggle";
import { normalizePrefs } from "@/lib/notification-categories";
import { CompletenessCard } from "@/components/dashboard/CompletenessCard";
import { creatorCompleteness, advertiserCompleteness } from "@/lib/profile-completeness";
import { ChannelManager, type ChannelRow } from "./ChannelManager";
import { CategoryPicker } from "./CategoryPicker";
import { getAppLocale } from "@/lib/i18n/app-locale";
import { dashboardDict } from "@/lib/i18n/app/dashboard";
import type { Locale } from "@/lib/i18n/config";

export async function generateMetadata() {
  const locale = await getAppLocale();
  const t = dashboardDict[locale].settings.metaTitle;
  return { title: locale === "ko" ? t : { absolute: `${t} — Luby AI` } };
}

export default async function SettingsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login?redirect=/dashboard/settings");

  const supabase = await createClient();
  const isInfluencer = profile.role === "influencer";
  const isAdvertiser = profile.role === "advertiser";
  // 크리에이터 화면만 다국어 — 광고주·운영자 설정은 한국어 고정
  const locale: Locale = isInfluencer ? await getAppLocale({ profileLocale: profile.locale }) : "ko";
  const t = dashboardDict[locale].settings;
  const tc = dashboardDict[locale].overview.completeness;

  // Pull role-specific extra info + channels + categories in parallel
  const [extraRes, regionsRes, channelsRes, channelTypesRes, categoriesRes, myCatsRes] =
    await Promise.all([
    isInfluencer
      ? supabase
          .from("influencers")
          .select("bio, region_id, public_profile")
          .eq("profile_id", profile.id)
          .maybeSingle()
      : isAdvertiser
        ? supabase
            .from("advertisers")
            .select("company_name, advertiser_kind, description, website, category_id, contact_phone, representative_name, business_address, tax_email, business_number")
            .eq("profile_id", profile.id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    supabase
      .from("regions")
      .select("id, code, name, flag")
      .eq("active", true)
      .order("sort_order"),
    isInfluencer
      ? supabase
          .from("influencer_channels")
          .select("id, channel_type_id, url, handle, followers, verified")
          .eq("influencer_id", profile.id)
          .order("created_at")
      : Promise.resolve({ data: [] }),
    isInfluencer
      ? supabase
          .from("channel_types")
          .select("id, slug, name")
          .eq("active", true)
          .order("sort_order")
      : Promise.resolve({ data: [] }),
    isInfluencer || isAdvertiser
      ? supabase
          .from("categories")
          .select("id, slug, name, emoji")
          .eq("active", true)
          .order("sort_order")
      : Promise.resolve({ data: [] }),
    isInfluencer
      ? supabase
          .from("influencer_categories")
          .select("category_id")
          .eq("influencer_id", profile.id)
      : Promise.resolve({ data: [] }),
  ]);

  const extra = extraRes.data ?? {};
  const { data: prefRow } = await supabase.from("profiles").select("email_prefs").eq("id", profile.id).maybeSingle();
  const emailPrefs = normalizePrefs(prefRow?.email_prefs);
  const pushCount = await countPushSubscriptions();
  const advCompleteness = isAdvertiser
    ? advertiserCompleteness({
        avatarUrl: profile.avatar_url,
        description: (extra as { description?: string | null }).description ?? null,
        categoryId: (extra as { category_id?: string | null }).category_id ?? null,
        website: (extra as { website?: string | null }).website ?? null,
        contactPhone: (extra as { contact_phone?: string | null }).contact_phone ?? profile.phone ?? null,
      })
    : null;
  const completeness = isInfluencer
    ? creatorCompleteness({
        avatarUrl: profile.avatar_url,
        bio: (extra as { bio?: string | null }).bio ?? null,
        regionId: (extra as { region_id?: string | null }).region_id ?? null,
        channelCount: (channelsRes.data ?? []).length,
        channelsWithFollowers: (channelsRes.data ?? []).filter((c) => (c.followers ?? 0) > 0).length,
        categoryCount: (myCatsRes.data ?? []).length,
        publicProfile: !!(extra as { public_profile?: boolean }).public_profile,
      })
    : null;

  return (
    <div>
      <h1 className="display text-3xl font-semibold lg:text-4xl">{t.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {isInfluencer
          ? t.subtitle
          : isAdvertiser
            ? "담당자 정보와 크리에이터에게 보여질 회사 프로필을 관리합니다."
            : "프로필 정보와 사진을 관리합니다."}
      </p>

      <div className="mt-8 space-y-4">
        {completeness && <CompletenessCard {...completeness} title={tc.title} doneText={tc.doneText} todoText={tc.todoText} nextText={tc.next} itemLabels={tc.items} itemHints={t.completenessHints} />}
        {advCompleteness && (
          <CompletenessCard {...advCompleteness} title="회사 프로필 완성도" doneText="완성! 크리에이터가 브랜드를 신뢰하고 응모해요" todoText="채울수록 응모율·선정 품질이 올라가요" />
        )}
        <SettingsForm
          profile={{
            id: profile.id,
            name: profile.name,
            email: profile.email,
            role: profile.role,
            avatar_url: profile.avatar_url,
          }}
          extra={extra}
          regions={regionsRes.data ?? []}
          categories={categoriesRes.data ?? []}
          locale={locale}
        />

        {isInfluencer && (
          <CategoryPicker
            categories={categoriesRes.data ?? []}
            selected={(myCatsRes.data ?? []).map((c) => c.category_id)}
            locale={locale}
          />
        )}

        {isInfluencer && (
          <ChannelManager
            channels={(channelsRes.data ?? []) as ChannelRow[]}
            channelTypes={channelTypesRes.data ?? []}
            locale={locale}
          />
        )}

        {isInfluencer && (
          <PublicProfileToggle
            userId={profile.id}
            initial={!!(extra as { public_profile?: boolean }).public_profile}
            approved={profile.approved}
            locale={locale}
          />
        )}

        <PushToggle subscriptionCount={pushCount} locale={locale} />
        <EmailPrefsForm initial={emailPrefs} showDigest locale={locale} />
      </div>
    </div>
  );
}
