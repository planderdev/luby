import type { Metadata } from "next";
import { LrePage } from "@/components/landing-re/LrePage";
import { fragment } from "@/components/landing-re/home-en-fragment";
import { NoticePopups } from "@/components/NoticePopups";
import { buildMetadata } from "@/lib/i18n/metadata";
import "../landing-re.css";

export const metadata: Metadata = buildMetadata("en");

// 팀장님 리뉴얼 시안(luby-re) 홈 — 시안 i18n 엔진으로 베이크한 영어 조각을 서버 렌더
export default function HomeEn() {
  return (
    <>
      <LrePage html={fragment} bundle="/lre/home.js" />
      <NoticePopups locale="en" />
    </>
  );
}
