import type { Metadata } from "next";
import { LrePage } from "@/components/landing-re/LrePage";
import { fragment } from "@/components/landing-re/home-fragment";
import { NoticePopups } from "@/components/NoticePopups";
import { RecoveryRedirect } from "@/components/RecoveryRedirect";
import { buildMetadata } from "@/lib/i18n/metadata";
import "./landing-re.css";

export const metadata: Metadata = buildMetadata("ko");

// 팀장님 리뉴얼 시안(luby-re) 포팅 — ko 홈만 먼저. en/zh 는 기존 Landing 유지 중
export default function Home() {
  return (
    <>
      <RecoveryRedirect />
      <LrePage html={fragment} bundle="/lre/home.js" />
      <NoticePopups locale="ko" />
    </>
  );
}
