import type { Metadata } from "next";
import { Landing } from "@/components/Landing";
import { NoticePopups } from "@/components/NoticePopups";
import { buildMetadata } from "@/lib/i18n/metadata";

export const metadata: Metadata = buildMetadata("zh");

export default function HomeZh() {
  return (
    <>
      <Landing locale="zh" />
      <NoticePopups locale="zh" />
    </>
  );
}
