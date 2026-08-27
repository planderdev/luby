import type { Metadata } from "next";
import { Landing } from "@/components/Landing";
import { NoticePopups } from "@/components/NoticePopups";
import { buildMetadata } from "@/lib/i18n/metadata";

export const metadata: Metadata = buildMetadata("en");

export default function HomeEn() {
  return (
    <>
      <Landing locale="en" />
      <NoticePopups locale="en" />
    </>
  );
}
