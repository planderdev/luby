"use client";

import { useEffect } from "react";

/**
 * 비밀번호 복구 링크가 Site URL(홈)로 떨어졌을 때 /reset-password로 넘긴다.
 * Supabase 허용 리다이렉트 목록에 /reset-password가 없어도 플로우가 끊기지 않게 하는 안전망.
 * 토큰(해시/코드)은 그대로 보존해 reset 페이지의 세션 처리에 맡긴다.
 */
export function RecoveryRedirect() {
  useEffect(() => {
    const hash = window.location.hash;
    const search = window.location.search;
    const isRecovery =
      (hash.includes("access_token") && hash.includes("type=recovery")) ||
      (search.includes("code=") && search.includes("type=recovery"));
    if (isRecovery && window.location.pathname !== "/reset-password") {
      window.location.replace(`/reset-password${search}${hash}`);
    }
  }, []);
  return null;
}
