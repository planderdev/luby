import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authErrorMessage } from "@/lib/auth-errors";
import { logError } from "@/lib/error-log";

/**
 * OAuth(구글·카카오) 콜백 — code 를 세션으로 교환하고, 역할이 확정되지 않은(onboarding_done=false)
 * 신규 가입자는 /onboarding 으로, 그 외에는 next(내부 경로만) 로 보낸다.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextRaw = searchParams.get("next") ?? "/dashboard";
  const next = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/dashboard";
  const role = searchParams.get("role");
  const ref = searchParams.get("ref");
  const errDesc = searchParams.get("error_description");

  if (!code) {
    // 사용자가 동의 화면에서 취소하면 access_denied 로 돌아온다
    const key = /access_denied|cancel/i.test(errDesc ?? "") ? "oauth_cancelled" : /not enabled|unsupported provider/i.test(errDesc ?? "") ? "oauth_disabled" : "oauth";
    if (errDesc) await logError({ source: "server", message: `OAuth callback: ${authErrorMessage(errDesc)} (${errDesc})`, path: "/auth/callback", userId: null, userAgent: request.headers.get("user-agent") });
    return NextResponse.redirect(`${origin}/login?error=${key}`);
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    await logError({ source: "server", message: `OAuth exchange: ${authErrorMessage(error)} (${error.message})`, path: "/auth/callback", userId: null, userAgent: request.headers.get("user-agent") });
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/login`);

  const { data: profile } = await supabase.from("profiles").select("onboarding_done").eq("id", user.id).maybeSingle();
  if (profile && profile.onboarding_done === false) {
    const q = new URLSearchParams();
    q.set("next", next);
    if (role === "advertiser" || role === "influencer") q.set("role", role);
    if (ref && /^[0-9a-f-]{36}$/.test(ref)) q.set("ref", ref);
    return NextResponse.redirect(`${origin}/onboarding?${q.toString()}`);
  }
  return NextResponse.redirect(`${origin}${next}`);
}
