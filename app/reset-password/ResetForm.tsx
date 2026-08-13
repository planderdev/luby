"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Phase = "checking" | "ready" | "no-session" | "done";

export function ResetForm() {
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
      setError("비밀번호는 8자 이상이어야 합니다.");
      return;
    }
    if (password !== confirm) {
      setError("비밀번호가 서로 일치하지 않습니다.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError(
        error.message.includes("different")
          ? "이전과 다른 비밀번호를 사용해주세요."
          : "비밀번호 변경에 실패했습니다. 링크가 만료되었을 수 있어요."
      );
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
      <div className="rounded-3xl border border-border bg-background p-8 text-center">
        <h2 className="text-lg font-semibold">링크가 유효하지 않아요</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          재설정 링크가 만료되었거나 이미 사용되었습니다.
          <br />
          다시 요청해주세요.
        </p>
        <Link
          href="/forgot-password"
          className="mt-6 inline-flex rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background"
        >
          재설정 링크 다시 받기
        </Link>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="rounded-3xl border border-border bg-background p-8 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-accent-soft">
          <CheckCircle2 className="size-7 text-accent-ink" />
        </div>
        <h2 className="mt-4 text-lg font-semibold">비밀번호가 변경되었어요</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          새 비밀번호로 로그인된 상태입니다.
        </p>
        <button
          type="button"
          onClick={() => {
            router.push("/dashboard");
            router.refresh();
          }}
          className="mt-6 inline-flex rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background"
        >
          대시보드로 가기
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
          새 비밀번호
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          required
          minLength={8}
          placeholder="8자 이상"
          className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-foreground"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
          새 비밀번호 확인
        </label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          required
          minLength={8}
          placeholder="한 번 더 입력"
          className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-foreground"
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
        비밀번호 변경
      </button>
    </form>
  );
}
