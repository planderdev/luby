import type { Metadata } from "next";
import { LrePage } from "@/components/landing-re/LrePage";
import { fragment, pageDescription, pageTitle } from "@/components/landing-re/brands-fragment";
import "./lre.css";

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: { canonical: "/brands" },
  openGraph: { title: pageTitle, description: pageDescription, url: "/brands" },
};

// 팀장님 리뉴얼 시안(luby-re) For Brands 페이지 포팅
export default function BrandsPage() {
  return <LrePage html={fragment} bundle="/lre/brands.js" />;
}
