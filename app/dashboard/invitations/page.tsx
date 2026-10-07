import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { InvitationCard } from "./InvitationCard";
import { getAppLocale } from "@/lib/i18n/app-locale";
import { dashboardDict } from "@/lib/i18n/app/dashboard";
import { getTranslationMap, translateCards } from "@/lib/i18n/campaign-translations";

export async function generateMetadata() {
  const locale = await getAppLocale();
  const t = dashboardDict[locale].invitations.metaTitle;
  return { title: locale === "ko" ? t : { absolute: `${t} — Luby AI` } };
}

type Camp = { id: string; title: string; business_name: string; point_amount: number; recruit_end: string; advertiser_id: string };

export default async function InvitationsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login?redirect=/dashboard/invitations");
  if (profile.role !== "influencer") redirect("/dashboard");

  const supabase = await createClient();
  const { data: invitations } = await supabase
    .from("campaign_invitations")
    .select(
      "id, status, message, created_at, campaigns!inner(id, title, business_name, point_amount, recruit_end, advertiser_id)"
    )
    .eq("influencer_id", profile.id)
    .order("created_at", { ascending: false });

  const list = invitations ?? [];
  const pendingCount = list.filter((i) => i.status === "pending").length;
  const locale = await getAppLocale({ profileLocale: profile.locale });
  const t = dashboardDict[locale].invitations;
  // /en·/zh 는 캠페인 제목·상호를 번역본으로
  const camps = list.map((i) => i.campaigns as unknown as Camp);
  const campById = new Map(translateCards(camps, await getTranslationMap(camps.map((c) => c.id), locale)).map((c) => [c.id, c]));

  return (
    <div>
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{t.eyebrow}</p>
      <h1 className="display mt-2 text-3xl font-semibold lg:text-4xl">
        {pendingCount > 0 ? t.titleSome(pendingCount) : t.title}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {t.subtitle}
      </p>

      <div className="mt-8 space-y-3">
        {list.map((inv) => {
          const raw = inv.campaigns as unknown as Camp;
          const c = campById.get(raw.id) ?? raw;
          return (
            <InvitationCard
              key={inv.id}
              id={inv.id}
              campaignId={c.id}
              campaignTitle={c.title}
              businessName={c.business_name}
              advertiserId={c.advertiser_id}
              message={inv.message}
              pointAmount={c.point_amount}
              recruitEnd={c.recruit_end}
              status={inv.status}
              locale={locale}
            />
          );
        })}
        {list.length === 0 && (
          <div className="rounded-3xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            {t.empty}
          </div>
        )}
      </div>
    </div>
  );
}
