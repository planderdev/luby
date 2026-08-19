import type { MetadataRoute } from "next";

/** PWA 매니페스트 — 크리에이터가 모바일 홈 화면에 추가해 앱처럼 사용 (알림·응모·제출) */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Luby AI — 글로벌 체험단",
    short_name: "Luby",
    description: "글로벌 인플루언서·체험단을 AI로 매칭하는 마케팅 플랫폼",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0a0c",
    theme_color: "#0a0a0c",
    lang: "ko",
    icons: [
      { src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/symbol.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/apple-icon.png", sizes: "512x512", type: "image/png" },
    ],
    shortcuts: [
      { name: "캠페인 둘러보기", url: "/dashboard/campaigns", icons: [{ src: "/symbol-128.png", sizes: "128x128" }] },
      { name: "내 응모", url: "/dashboard/applications" },
      { name: "알림", url: "/dashboard/notifications" },
    ],
  };
}
