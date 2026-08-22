import { redirect } from "next/navigation";
import Link from "next/link";
import QRCode from "qrcode";
import { ArrowLeft, EyeOff } from "lucide-react";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/seo/site";
import { PrintButton } from "@/app/r/[token]/PrintButton";
import { CreatorCardSheet } from "@/components/CreatorCardSheet";
import { fetchPublicCreator } from "@/components/PublicCreatorView";

export const metadata = { title: "QR 명함 — 루비AI", robots: { index: false, follow: false } };

/**
 * 크리에이터 QR 명함 — A4 한 장에 10장(90×55mm). QR → 공개 프로필(/p/[id]).
 * 공개 프로필이 꺼져 있으면 QR 이 남에게는 열리지 않으므로 켜기 안내.
 */
export default async function CreatorCardPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login?redirect=/dashboard/portfolio/card");
  if (profile.role !== "influencer") redirect("/dashboard");
  const supabase = await createClient();
  const [{ data: inf }, c] = await Promise.all([
    supabase.from("influencers").select("public_profile").eq("profile_id", profile.id).maybeSingle(),
    fetchPublicCreator(profile.id, { asOwner: true }),
  ]);
  if (!c) redirect("/dashboard/portfolio");
  const isPublic = !!inf?.public_profile;
  const url = `${getSiteUrl()}/p/${profile.id}`;
  const qr = await QRCode.toString(url, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#151217", light: "#ffffff" } });
  const channels = [...c.channels].sort((a, b) => (b.followers ?? 0) - (a.followers ?? 0)).map((ch) => ({ type: ch.type, handle: ch.handle, followers: ch.followers ?? 0 }));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/dashboard/portfolio" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> 포트폴리오로</Link>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">A4 · 명함 10장(90×55mm) · 인쇄 여백 "없음" 권장</span>
          <PrintButton />
        </div>
      </div>
      {!isPublic && (
        <div className="mb-6 flex flex-wrap items-center gap-2.5 rounded-2xl border border-warning/40 bg-warning-soft/40 px-5 py-4 text-sm print:hidden">
          <EyeOff className="size-4 shrink-0 text-warning" />
          <span>
            공개 프로필이 <b>꺼져</b> 있어 QR을 찍어도 남에게는 열리지 않아요.{" "}
            <Link href="/dashboard/settings#public" className="font-medium underline underline-offset-2">설정에서 공개 프로필을 켜고</Link> 인쇄하세요.
          </span>
        </div>
      )}
      <CreatorCardSheet
        d={{
          name: c.name,
          avatarUrl: c.avatar_url,
          categories: c.categories.map((k) => `${k.emoji} ${k.name}`),
          region: c.region ? `${c.region.flag} ${c.region.name}` : null,
          channels,
          url,
          qrSvg: qr,
        }}
      />
    </div>
  );
}
