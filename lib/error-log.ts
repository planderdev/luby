import "server-only";
import { getAdminSupabase } from "@/lib/supabase/admin";

/** 서버·클라이언트 오류를 server_errors 에 기록 (실패해도 호출부에 영향 없음). 메시지에서 토큰·키 패턴은 마스킹. */
export async function logError(row: {
  source: "server" | "client";
  message: string;
  stack?: string | null;
  digest?: string | null;
  path?: string | null;
  method?: string | null;
  routeType?: string | null;
  userId?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  try {
    const mask = (t: string | null | undefined) =>
      (t ?? "").replace(/(eyJ[a-zA-Z0-9_-]{20,})/g, "[jwt]").replace(/(sk-[a-zA-Z0-9_-]{10,}|re_[a-zA-Z0-9]{10,})/g, "[key]").slice(0, 4000);
    await getAdminSupabase().from("server_errors").insert({
      source: row.source,
      message: mask(row.message) || "(no message)",
      stack: row.stack ? mask(row.stack) : null,
      digest: row.digest ?? null,
      path: row.path?.split("?")[0].slice(0, 300) ?? null,
      method: row.method ?? null,
      route_type: row.routeType ?? null,
      user_id: row.userId ?? null,
      user_agent: row.userAgent?.slice(0, 200) ?? null,
    });
  } catch (e) {
    console.error("[error-log] failed", e instanceof Error ? e.message : e);
  }
}
