import type { Metadata } from "next";
import { LrePage } from "@/components/landing-re/LrePage";
import { fragment, pageDescription, pageTitle } from "@/components/landing-re/solutions-fragment";
import "./lre.css";

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: { canonical: "/solutions" },
  openGraph: { title: pageTitle, description: pageDescription, url: "/solutions" },
};

// 팀장님 리뉴얼 시안(luby-re) Solutions 페이지 포팅
export default function SolutionsPage() {
  return <LrePage html={fragment} bundle="/lre/solutions.js" />;
}
