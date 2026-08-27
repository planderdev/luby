import type { Metadata } from "next";
import { Landing } from "@/components/Landing";
import { NoticePopups } from "@/components/NoticePopups";
import { RecoveryRedirect } from "@/components/RecoveryRedirect";
import { buildMetadata } from "@/lib/i18n/metadata";

export const metadata: Metadata = buildMetadata("ko");

export default function Home() {
  return (
    <>
      <RecoveryRedirect />
      <Landing locale="ko" />
      <NoticePopups locale="ko" />
    </>
  );
}
