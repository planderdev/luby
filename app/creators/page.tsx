import type { Metadata } from "next";
import { CreatorLanding, buildCreatorLandingMetadata } from "@/components/CreatorLanding";

export const revalidate = 600;
export const metadata: Metadata = buildCreatorLandingMetadata("ko");

export default function Page() {
  return <CreatorLanding locale="ko" />;
}
