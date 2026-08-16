import type { Metadata } from "next";
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
  // Next.js auto-generates <link rel="icon"> from app/icon.png and
  // <link rel="apple-touch-icon"> from app/apple-icon.png — no manual icons config needed.
};

const themeScript = `
(function(){try{
  var s=localStorage.getItem('theme');
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
        {children}
        <GoogleAds />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
