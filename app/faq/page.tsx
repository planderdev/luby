import type { Metadata } from "next";
import { LrePage } from "@/components/landing-re/LrePage";
import { fragment, pageDescription, pageTitle } from "@/components/landing-re/faq-fragment";
import "./lre.css";

export const metadata: Metadata = { title: pageTitle, description: pageDescription };

// 팀장님 리뉴얼 시안(luby-re) FAQ 페이지 포팅
export default function FaqPage() {
  return <LrePage html={fragment} bundle="/lre/faq.js" />;
}
