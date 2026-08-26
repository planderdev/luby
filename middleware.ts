import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // 세션 확인·갱신이 실제로 필요한 경로만. 공개 페이지(/, /c, /p, /docs, /creators …)는
  // 미들웨어를 거치지 않아야 CDN 캐시가 그대로 살고 첫 응답이 빨라진다.
  // (토큰 갱신은 브라우저 Supabase 클라이언트가 자동으로 하며, 대시보드 진입 시 여기서 다시 맞춘다)
  matcher: ["/dashboard/:path*", "/campaigns/new", "/admin/:path*", "/onboarding/:path*", "/login", "/signup"],
};
