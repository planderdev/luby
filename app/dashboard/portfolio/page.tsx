import { redirect } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Link2, QrCode } from "lucide-react";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { PublicCreatorView } from "@/components/PublicCreatorView";
import { getSiteUrl } from "@/lib/seo/site";

export const metadata = { title: "내 포트폴리오 — 루비AI" };

/**
 * 크리에이터 본인 포트폴리오 미리보기 — 공개 프로필이 꺼져 있어도 본인은 볼 수 있고, 인쇄/PDF 저장 가능.
 * 공개가 켜져 있으면 공유 링크(/p/[id])를 함께 안내.
 */
export default async function PortfolioPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login?redirect=/dashboard/portfolio");
  if (profile.role !== "influencer") redirect("/dashboard");
  const supabase = await createClient();
  const { data: inf } = await supabase.from("influencers").select("public_profile").eq("profile_id", profile.id).maybeSingle();
  const isPublic = !!inf?.public_profile;
  const shareUrl = `${getSiteUrl()}/p/${profile.id}`;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-muted/40 px-5 py-4 print:hidden">
        <div className="flex items-center gap-2.5 text-sm">
          {isPublic ? <Eye className="size-4 text-success" /> : <EyeOff className="size-4 text-muted-foreground" />}
          {isPublic ? (
            <span>
              공개 프로필이 <b>켜져</b> 있어요. 링크를 브랜드에 보내면 로그인 없이 볼 수 있습니다:{" "}
              <a href={shareUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium underline underline-offset-2"><Link2 className="size-3.5" />{shareUrl.replace(/^https?:\/\//, "")}</a>
            </span>
          ) : (
            <span>
              지금은 <b>본인만</b> 볼 수 있어요. PDF로 저장해 브랜드에 직접 보내거나, <Link href="/dashboard/settings#public" className="font-medium underline underline-offset-2">공개 프로필을 켜면</Link> 링크로 공유할 수 있습니다.
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {!profile.approved && <span className="text-xs text-warning">승인 전에는 공개 프로필을 켤 수 없어요</span>}
          <Link href="/dashboard/portfolio/card" className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3.5 py-1.5 text-xs font-medium hover:bg-muted">
            <QrCode className="size-3.5" /> QR 명함 A4 인쇄
          </Link>
        </div>
      </div>
      <div className="-mx-5 overflow-hidden rounded-3xl border border-border md:-mx-8 lg:mx-0 print:m-0 print:rounded-none print:border-0">
        <PublicCreatorView id={profile.id} ownerPreview />
      </div>
    </div>
  );
}
