import type { Metadata } from "next";
import { PublicCampaignView, buildPublicCampaignMetadata } from "@/components/PublicCampaignView";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return buildPublicCampaignMetadata(id, "zh");
}

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ref?: string }> }) {
  const { id } = await params;
  const { ref } = await searchParams;
  const refId = ref && /^[0-9a-f-]{36}$/.test(ref) ? ref : null;
  return <PublicCampaignView id={id} refId={refId} locale="zh" />;
}
