import type { Metadata } from "next";
import { LrePage } from "@/components/landing-re/LrePage";
import { fragment, pageDescription, pageTitle } from "@/components/landing-re/for-creators-fragment";
import "./lre.css";

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: { canonical: "/for-creators" },
  openGraph: { title: pageTitle, description: pageDescription, url: "/for-creators" },
};

// 팀장님 리뉴얼 시안(luby-re) For Creators 페이지 포팅
export default function ForCreatorsPage() {
  return <LrePage html={fragment} bundle="/lre/for-creators.js" />;
}
