import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import QRCode from "qrcode";
import { ArrowLeft } from "lucide-react";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/seo/site";
import { PrintButton } from "@/app/r/[token]/PrintButton";
import { PosterSheet } from "@/components/PosterSheet";

export const metadata = { title: "매장용 포스터 — 루비AI", robots: { index: false, follow: false } };

/**
 * 매장용 A4 QR 포스터 — 캠페인 소유자(광고주·대행사)·운영자. 인쇄하면 헤더 없이 포스터만 출력.
 * QR → 공개 캠페인 페이지(/c/[id]) — 로그인 없이 열리고 가입·응모로 이어진다.
 */
export default async function PosterPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ lang?: string }> }) {
  const { id } = await params;
  const { lang } = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  const supabase = await createClient();
  const { data: c } = await supabase
    .from("campaigns")
    .select("id, title, business_name, point_amount, recruit_count, recruit_end, always_open, status, advertiser_id, category_id, promotion_type_id")
    .eq("id", id)
    .maybeSingle();
  if (!c) notFound();
  if (c.advertiser_id !== profile.id && profile.role !== "operator") redirect("/dashboard");

  const [{ data: offerings }, { data: promo }, { data: channels }] = await Promise.all([
    supabase.from("campaign_offerings").select("title, estimated_value").eq("campaign_id", id).limit(3),
    c.promotion_type_id ? supabase.from("promotion_types").select("name").eq("id", c.promotion_type_id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("campaign_channels").select("channel_types(name)").eq("campaign_id", id),
  ]);

  const locale = lang === "en" ? "en" : lang === "zh" ? "zh" : "ko";
  const prefix = locale === "ko" ? "" : `/${locale}`;
  const url = `${getSiteUrl()}${prefix}/c/${c.id}`;
  const qr = await QRCode.toString(`${url}?src=qr`, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#151217", light: "#ffffff" } });
  const channelNames = (channels ?? []).map((x) => (x.channel_types as unknown as { name: string } | null)?.name).filter(Boolean) as string[];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <Link href={`/dashboard/campaigns/${c.id}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> 캠페인으로</Link>
          <div className="flex items-center gap-1 rounded-full border border-border p-0.5 text-[11px]">
            {(["ko", "en", "zh"] as const).map((l) => (
              <Link key={l} href={`/dashboard/campaigns/${c.id}/poster?lang=${l}`} className={`rounded-full px-2 py-0.5 ${l === locale ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}>{l === "ko" ? "KR" : l === "en" ? "EN" : "CN"}</Link>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">A4 세로 · 인쇄 대화상자에서 여백 "없음" 권장</span>
          <PrintButton />
        </div>
      </div>

      <PosterSheet
        d={{
          title: c.title,
          businessName: c.business_name,
          promotion: promo?.name ?? null,
          pointAmount: c.point_amount,
          recruitCount: c.recruit_count,
          recruitEnd: c.recruit_end,
          alwaysOpen: c.always_open,
          channels: channelNames,
          offerings: offerings ?? [],
          url,
          qrSvg: qr,
          locale,
        }}
      />
    </div>
  );
}
