/** 소셜 로그인 노출 제어 — Vercel 환경변수 NEXT_PUBLIC_AUTH_PROVIDERS="google,kakao" (Supabase 콘솔에 프로바이더 설정 후 켜기) */
export type OAuthProvider = "google" | "kakao";
export function enabledProviders(): OAuthProvider[] {
  const raw = process.env.NEXT_PUBLIC_AUTH_PROVIDERS ?? "";
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s): s is OAuthProvider => s === "google" || s === "kakao");
}
