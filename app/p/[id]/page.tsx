import type { Metadata } from "next";
import { PublicCreatorView, buildPublicCreatorMetadata } from "@/components/PublicCreatorView";

export const revalidate = 300;
// 첫 요청 때 렌더해 ISR 캐시에 올린다
export const dynamicParams = true;
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return buildPublicCreatorMetadata(id);
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PublicCreatorView id={id} />;
}
