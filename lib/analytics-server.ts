import "server-only";
import { track } from "@vercel/analytics/server";

type Props = Record<string, string | number | boolean>;

/** 서버 액션·서버 컴포넌트용 전환 이벤트 (이벤트 목록은 lib/analytics.ts 참고) */
export async function trackServer(event: string, props?: Props) {
  try {
    await track(event, props);
  } catch {
    /* noop */
  }
}
