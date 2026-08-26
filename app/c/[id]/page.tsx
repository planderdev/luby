import type { Metadata } from "next";
import { PublicCampaignView, buildPublicCampaignMetadata } from "@/components/PublicCampaignView";

export const revalidate = 300;
// 첫 요청 때 렌더해 ISR 캐시에 올린다(빌드 시점에는 목록을 굳이 고정하지 않는다)
export const dynamicParams = true;
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return buildPublicCampaignMetadata(id, "ko");
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PublicCampaignView id={id} locale="ko" />;
}
