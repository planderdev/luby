import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: path.resolve(__dirname),
  },
  async headers() {
    // 오픈 전 기본 보안 헤더. CSP는 토스 결제창·Supabase·GA 도메인 정리 후 별도 도입.
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(self \"https://*.tosspayments.com\")" },
        ],
      },
    ];
  },
  async redirects() {
    // 표기는 CN 이지만 URL 로케일 코드는 표준 zh 유지 — /cn/* 로 들어오면 /zh/* 로 영구 이동
    const cnAlias = [
      { source: "/cn", destination: "/zh", permanent: true },
      { source: "/cn/:path*", destination: "/zh/:path*", permanent: true },
    ];
    // 도메인 이전 (ruby-ai.kr → luby.im, SEO 308).
    // luby.im DNS가 살아있기 전에 켜면 전체 서비스가 죽으므로
    // NEXT_PUBLIC_PRIMARY_DOMAIN=luby.im 환경변수로 게이트한다 (Phase B에서 활성화).
    if (process.env.NEXT_PUBLIC_PRIMARY_DOMAIN !== "luby.im") return cnAlias;
    return [
      ...cnAlias,
      {
        source: "/:path*",
        has: [{ type: "host" as const, value: "ruby-ai.kr" }],
        destination: "https://luby.im/:path*",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "host" as const, value: "www.ruby-ai.kr" }],
        destination: "https://luby.im/:path*",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "host" as const, value: "www.luby.im" }],
        destination: "https://luby.im/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
