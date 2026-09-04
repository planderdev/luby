import type { Metadata } from "next";
import { LrePage } from "@/components/landing-re/LrePage";
import { LreMixSections } from "@/components/landing-re/LreMixSections";
import { fragmentTop, fragmentBottom } from "@/components/landing-re/home-zh-fragment";
import { NoticePopups } from "@/components/NoticePopups";
import { StructuredData } from "@/components/StructuredData";
import { HtmlLang } from "@/components/HtmlLang";
import { buildMetadata } from "@/lib/i18n/metadata";
import "../landing-re.css";
import "../lre-mix.css";

export const metadata: Metadata = buildMetadata("zh");

// 리뉴얼 시안 홈(중국어 베이크) + 기존 기획 섹션 믹싱
export default function HomeZh() {
  return (
    <>
      <HtmlLang locale="zh" />
      <StructuredData locale="zh" />
      <LrePage html={fragmentTop} htmlBottom={fragmentBottom} bundle="/lre/home.js">
        <LreMixSections locale="zh" />
      </LrePage>
      <NoticePopups locale="zh" />
    </>
  );
}
