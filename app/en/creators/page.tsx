import type { Metadata } from "next";
import { CreatorLanding, buildCreatorLandingMetadata } from "@/components/CreatorLanding";

export const revalidate = 600;
export const metadata: Metadata = buildCreatorLandingMetadata("en");

export default function Page() {
  return <CreatorLanding locale="en" />;
}
