import type { Metadata } from "next";
import { LrePage } from "@/components/landing-re/LrePage";
import { LreMixSections } from "@/components/landing-re/LreMixSections";
import { fragmentTop, fragmentBottom } from "@/components/landing-re/home-en-fragment";
import { NoticePopups } from "@/components/NoticePopups";
import { StructuredData } from "@/components/StructuredData";
import { HtmlLang } from "@/components/HtmlLang";
import { buildMetadata } from "@/lib/i18n/metadata";
import "../landing-re.css";
import "../lre-mix.css";

export const metadata: Metadata = buildMetadata("en");

// 리뉴얼 시안 홈(영어 베이크) + 기존 기획 섹션 믹싱
export default function HomeEn() {
  return (
    <>
      <HtmlLang locale="en" />
      <StructuredData locale="en" />
      <LrePage html={fragmentTop} htmlBottom={fragmentBottom} bundle="/lre/home.js">
        <LreMixSections locale="en" />
      </LrePage>
      <NoticePopups locale="en" />
    </>
  );
}
