"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { OAuthProvider } from "@/lib/auth-providers";

/**
 * 소셜 로그인 버튼 — Supabase OAuth. 콜백(/auth/callback)이 세션 교환 후 온보딩/next 로 라우팅.
 * role/ref/next 는 콜백 쿼리로 전달(신규 가입 시 온보딩에서 사용).
 */
export function OAuthButtons({
  providers,
  next = "/dashboard",
  role,
  refId,
  label = "또는",
}: {
  providers: OAuthProvider[];
  next?: string;
  role?: "advertiser" | "influencer" | null;
  refId?: string | null;
  label?: string;
}) {
  const [pending, setPending] = useState<OAuthProvider | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (providers.length === 0) return null;

  async function go(p: OAuthProvider) {
    setError(null);
    setPending(p);
    const q = new URLSearchParams({ next });
    if (role) q.set("role", role);
    if (refId) q.set("ref", refId);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: p,
      options: { redirectTo: `${window.location.origin}/auth/callback?${q.toString()}` },
    });
    if (error) {
      setError(error.message);
      setPending(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        {label}
        <span className="h-px flex-1 bg-border" />
      </div>
      <div className="grid gap-2">
        {providers.includes("google") && (
          <button
            type="button"
            onClick={() => go("google")}
            disabled={pending !== null}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-background px-4 py-3 text-sm font-medium hover:bg-muted disabled:opacity-60"
          >
            {pending === "google" ? <Loader2 className="size-4 animate-spin" /> : <GoogleIcon />}
            Google로 계속하기
          </button>
        )}
        {providers.includes("kakao") && (
          <button
            type="button"
            onClick={() => go("kakao")}
            disabled={pending !== null}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium text-[#191919] disabled:opacity-60"
            style={{ background: "#FEE500" }}
          >
            {pending === "kakao" ? <Loader2 className="size-4 animate-spin" /> : <KakaoIcon />}
            카카오로 계속하기
          </button>
        )}
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.6 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6C12.3 13.5 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17z" />
      <path fill="#FBBC05" d="M10.4 28.8A14.5 14.5 0 0 1 9.5 24c0-1.7.3-3.3.8-4.8l-7.8-6A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.8-6z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.7-4-13.6-9.7l-7.8 6C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}
function KakaoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#191919" d="M12 3C6.5 3 2 6.5 2 10.8c0 2.7 1.8 5.1 4.5 6.5l-1 3.8c-.1.3.3.6.6.4l4.4-2.9c.5.1 1 .1 1.5.1 5.5 0 10-3.5 10-7.9S17.5 3 12 3z" />
    </svg>
  );
}
