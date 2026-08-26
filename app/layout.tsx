import { ClientErrorReporter } from "@/components/ClientErrorReporter";
import type { Metadata } from "next";
// Pretendard Variable — 유니코드 범위별 동적 서브셋 92개를 셀프호스팅 (jsDelivr 경로 404 사고 이후, 2026-08-23)
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./globals.css";
import { SITE, getSiteUrl } from "@/lib/seo/site";
import { GoogleAds } from "@/components/GoogleAds";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const siteUrl = getSiteUrl();
const title = `${SITE.name} — ${SITE.tagline}`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: title,
    // Sub-pages can override default title; this template wraps it.
    template: `%s — ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: [...SITE.keywords],
  authors: [{ name: SITE.name }],
  creator: SITE.name,
  publisher: SITE.name,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: "/",
    languages: {
      "ko-KR": "/",
      en: "/en",
      "zh-CN": "/zh",
      "x-default": "/",
    },
  },
  openGraph: {
    title,
    description: SITE.description,
    type: "website",
    siteName: SITE.name,
    locale: SITE.locale,
    url: "/",
    images: [
      {
        url: "/og.png",
        width: 1280,
        height: 720,
        alt: `Luby AI — ${SITE.tagline}`,
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description: SITE.description,
    images: ["/og.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  // Search Console 'HTML 태그' 방식으로 소유권을 확인할 때 쓴다.
  // GOOGLE_SITE_VERIFICATION 에 content 값만 넣으면 <meta name="google-site-verification"> 이 붙는다.
  // (DNS TXT 로 도메인 속성을 확인했다면 필요 없다)
  ...(process.env.GOOGLE_SITE_VERIFICATION
    ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } }
    : {}),
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Luby" },
  // Next.js auto-generates <link rel="icon"> from app/icon.png and
  // <link rel="apple-touch-icon"> from app/apple-icon.png — no manual icons config needed.
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbf8fc" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0c" },
  ],
  width: "device-width",
  initialScale: 1,
};

const themeScript = `
(function(){try{
  var s=localStorage.getItem('theme');
  var q=new URLSearchParams(location.search).get('theme');
  if(q==='light'||q==='dark')s=q;
  var d=s?s==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;
  if(d)document.documentElement.classList.add('dark');
}catch(e){}})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang={SITE.language} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="antialiased">
        <ClientErrorReporter />
        {children}
        <GoogleAds />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
