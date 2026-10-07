"use client";

import { authErrorMessage } from "@/lib/auth-errors";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { authDict } from "@/lib/i18n/app/auth";
import type { Locale } from "@/lib/i18n/config";

type Phase = "checking" | "ready" | "no-session" | "done";

export function ResetForm({ locale = "ko" }: { locale?: Locale }) {
  const t = authDict[locale].reset;
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 복구 링크로 진입 시 세션 확보:
  // - implicit 링크(#access_token)는 detectSessionInUrl이 자동 처리
  // - PKCE 링크(?code=)는 exchangeCodeForSession으로 교환
  useEffect(() => {
    const supabase = createClient();
    let done = false;

    async function establish() {
      // implicit 링크(#access_token) — PKCE 클라이언트는 해시를 자동 소비하지 않으므로 명시 처리
      const hashParams = new URLSearchParams(window.location.hash.slice(1));
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      if (accessToken && refreshToken) {
        await supabase.auth
          .setSession({ access_token: accessToken, refresh_token: refreshToken })
          .catch(() => null);
        // 토큰이 URL에 남지 않도록 제거
        window.history.replaceState(null, "", window.location.pathname);
      }

      const code = new URLSearchParams(window.location.search).get("code");
      if (code) {
        await supabase.auth.exchangeCodeForSession(code).catch(() => null);
      }
      // 해시 토큰 처리 시간을 약간 준 뒤 세션 확인
      for (let i = 0; i < 6; i++) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) {
          if (!done) setPhase("ready");
          return;
        }
        await new Promise((r) => setTimeout(r, 500));
      }
      if (!done) setPhase("no-session");
    }

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        if (!done) setPhase("ready");
      }
    });

    void establish();
    return () => {
      done = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError(t.tooShort);
      return;
    }
    if (password !== confirm) {
      setError(t.mismatch);
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError(authErrorMessage(error, t.failed, locale));
      return;
    }
    setPhase("done");
  }

  if (phase === "checking") {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (phase === "no-session") {
    return (
      <div className="rounded-3xl glass-card p-8 text-center">
        <h2 className="text-lg font-semibold">{t.invalidTitle}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {t.invalidBody1}
          <br />
          {t.invalidBody2}
        </p>
        <Link
          href={locale === "ko" ? "/forgot-password" : `/forgot-password?lang=${locale}`}
          className="mt-6 inline-flex rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background"
        >
          {t.getNewLink}
        </Link>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="rounded-3xl glass-card p-8 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-accent-soft">
          <CheckCircle2 className="size-7 text-accent-ink" />
        </div>
        <h2 className="mt-4 text-lg font-semibold">{t.doneTitle}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t.doneBody}</p>
        <button
          type="button"
          onClick={() => {
            router.push("/dashboard");
            router.refresh();
          }}
          className="mt-6 inline-flex rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background"
        >
          {t.toDashboard}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
          {t.newPw}
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          required
          minLength={8}
          placeholder={t.phMin}
          className="w-full rounded-2xl glass-card px-4 py-3 text-sm outline-none transition-colors focus:border-foreground"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
          {t.confirmPw}
        </label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          required
          minLength={8}
          placeholder={t.phAgain}
          className="w-full rounded-2xl glass-card px-4 py-3 text-sm outline-none transition-colors focus:border-foreground"
        />
      </div>
      {error && (
        <div className="rounded-2xl border border-accent/30 bg-accent-soft px-4 py-3 text-sm text-accent-ink">
          {error}
        </div>
      )}
      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-foreground px-6 py-3.5 text-sm font-medium text-background transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
      >
        {loading && <Loader2 className="size-4 animate-spin" />}
        {t.submit}
      </button>
    </form>
  );
}
