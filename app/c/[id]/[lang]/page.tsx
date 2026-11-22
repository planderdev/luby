import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicCampaignView, buildPublicCampaignMetadata } from "@/components/PublicCampaignView";
import { extraLangBySlug } from "@/lib/i18n/content-langs";

/**
 * 추가 언어 공개 캠페인 페이지 — /c/<id>/ja · zh-tw · th · vi · id.
 * 본문(제목·미션·제공 내역·가이드)만 그 언어 번역본이고, 버튼·라벨은 영어(번체는 중문) 화면을 쓴다.
 */
export const revalidate = 300;
export const dynamicParams = true;
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: { params: Promise<{ id: string; lang: string }> }): Promise<Metadata> {
  const { id, lang } = await params;
  const cl = extraLangBySlug(lang);
  if (!cl) return { robots: { index: false } };
  return buildPublicCampaignMetadata(id, cl.ui, cl);
}

export default async function Page({ params }: { params: Promise<{ id: string; lang: string }> }) {
  const { id, lang } = await params;
  const cl = extraLangBySlug(lang);
  if (!cl) notFound();
  return <PublicCampaignView id={id} locale={cl.ui} contentLang={cl} />;
}
