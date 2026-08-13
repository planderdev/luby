import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: path.resolve(__dirname),
  },
  async redirects() {
    // 도메인 이전 (ruby-ai.kr → luby.im, SEO 308).
    // luby.im DNS가 살아있기 전에 켜면 전체 서비스가 죽으므로
    // NEXT_PUBLIC_PRIMARY_DOMAIN=luby.im 환경변수로 게이트한다 (Phase B에서 활성화).
    if (process.env.NEXT_PUBLIC_PRIMARY_DOMAIN !== "luby.im") return [];
    return [
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
