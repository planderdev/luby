import type { Metadata } from "next";
import { LrePage } from "@/components/landing-re/LrePage";
import { LreMixSections } from "@/components/landing-re/LreMixSections";
import { fragmentTop, fragmentBottom } from "@/components/landing-re/home-fragment";
import { NoticePopups } from "@/components/NoticePopups";
import { RecoveryRedirect } from "@/components/RecoveryRedirect";
import { StructuredData } from "@/components/StructuredData";
import { buildMetadata } from "@/lib/i18n/metadata";
import "./landing-re.css";
import "./lre-mix.css";

export const metadata: Metadata = buildMetadata("ko");

// 팀장님 리뉴얼 시안(luby-re) 홈 + 기존 기획 섹션(작동 방식·핵심 기능·요금제) 믹싱
export default function Home() {
  return (
    <>
      <RecoveryRedirect />
      <StructuredData locale="ko" />
      <LrePage html={fragmentTop} htmlBottom={fragmentBottom} bundle="/lre/home.js">
        <LreMixSections locale="ko" />
      </LrePage>
      <NoticePopups locale="ko" />
    </>
  );
}
