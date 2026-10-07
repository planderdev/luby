import { redirect } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Link2, QrCode, BarChart3 } from "lucide-react";
import { viewSourceRows, CREATOR_VIEW_SOURCE_LABEL } from "@/lib/view-sources";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { PublicCreatorView } from "@/components/PublicCreatorView";
import { getSiteUrl } from "@/lib/seo/site";
import { getAppLocale } from "@/lib/i18n/app-locale";
import { dashboardDict } from "@/lib/i18n/app/dashboard";

export async function generateMetadata() {
  const locale = await getAppLocale();
  const t = dashboardDict[locale].portfolio.metaTitle;
  return { title: locale === "ko" ? t : { absolute: `${t} — Luby AI` } };
}

/**
 * 크리에이터 본인 포트폴리오 미리보기 — 공개 프로필이 꺼져 있어도 본인은 볼 수 있고, 인쇄/PDF 저장 가능.
 * 공개가 켜져 있으면 공유 링크(/p/[id])를 함께 안내.
 */
export default async function PortfolioPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login?redirect=/dashboard/portfolio");
  if (profile.role !== "influencer") redirect("/dashboard");
  const supabase = await createClient();
  const locale = await getAppLocale({ profileLocale: profile.locale });
  const t = dashboardDict[locale].portfolio;
  const [{ data: inf }, { data: viewsRaw }] = await Promise.all([
    supabase.from("influencers").select("public_profile").eq("profile_id", profile.id).maybeSingle(),
    supabase.rpc("creator_view_stats", { p_creator: profile.id }),
  ]);
  const isPublic = !!inf?.public_profile;
  const shareUrl = `${getSiteUrl()}/p/${profile.id}`;
  const views = (viewsRaw as { total: number; uniques: number; last7: number; last30: number; by_source: Record<string, number> } | null) ?? null;
  const sourceRows = viewSourceRows(views?.by_source, locale === "ko" ? CREATOR_VIEW_SOURCE_LABEL : t.sources);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-muted/40 px-5 py-4 print:hidden">
        <div className="flex items-center gap-2.5 text-sm">
          {isPublic ? <Eye className="size-4 text-success" /> : <EyeOff className="size-4 text-muted-foreground" />}
          {isPublic ? (
            <span>
              {t.onBefore}<b>{t.onBold}</b>{t.onAfter}
              <a href={`${shareUrl}?src=link`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium underline underline-offset-2"><Link2 className="size-3.5" />{shareUrl.replace(/^https?:\/\//, "")}</a>
            </span>
          ) : (
            <span>
              {t.offBefore}<b>{t.offBold}</b>{t.offMid}<Link href="/dashboard/settings#public" className="font-medium underline underline-offset-2">{t.offLink}</Link>{t.offAfter}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {!profile.approved && <span className="text-xs text-warning">{t.notApproved}</span>}
          <Link href="/dashboard/portfolio/card" className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3.5 py-1.5 text-xs font-medium hover:bg-muted">
            <QrCode className="size-3.5" /> {t.qrCard}
          </Link>
        </div>
      </div>
      {isPublic && (
        <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl border border-border bg-background px-5 py-3 text-xs text-muted-foreground print:hidden">
          <span className="inline-flex items-center gap-1.5 font-medium text-foreground"><BarChart3 className="size-3.5" /> {t.viewsTitle}</span>
          {views && views.total > 0 ? (
            <>
              <span>{t.viewsTotalBefore}<b className="text-foreground">{views.total.toLocaleString()}</b>{t.viewsTotalAfter}{t.viewsUnique(views.uniques.toLocaleString())}{t.viewsLast7(views.last7.toLocaleString())}</span>
              {sourceRows.map((r) => (
                <span key={r.key}>{r.label} <b className="text-foreground">{r.views.toLocaleString()}</b></span>
              ))}
            </>
          ) : (
            <span>{t.viewsEmpty}</span>
          )}
        </div>
      )}
      <div className="-mx-5 overflow-hidden rounded-3xl border border-border md:-mx-8 lg:mx-0 print:m-0 print:rounded-none print:border-0">
        <PublicCreatorView id={profile.id} ownerPreview locale={locale} />
      </div>
    </div>
  );
}
