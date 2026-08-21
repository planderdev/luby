import type { Metadata } from "next";
import { PublicCampaignDirectory, buildDirectoryMetadata, type DirectoryParams } from "@/components/PublicCampaignDirectory";

// 필터·페이지 쿼리에 따라 달라지므로 요청 시 렌더 (RPC 는 가벼움)
export const dynamic = "force-dynamic";
export const metadata: Metadata = buildDirectoryMetadata("ko");

export default async function Page({ searchParams }: { searchParams: Promise<DirectoryParams> }) {
  const params = await searchParams;
  return <PublicCampaignDirectory locale="ko" params={params} />;
}
