import type { Metadata } from "next";
import { PublicCampaignView, buildPublicCampaignMetadata } from "@/components/PublicCampaignView";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return buildPublicCampaignMetadata(id, "zh");
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PublicCampaignView id={id} locale="zh" />;
}
