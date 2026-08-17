import type { Metadata } from "next";
import { PublicCreatorView, buildPublicCreatorMetadata } from "@/components/PublicCreatorView";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return buildPublicCreatorMetadata(id, "en");
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PublicCreatorView id={id} locale="en" />;
}
