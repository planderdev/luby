"use client";

import { useState } from "react";
import { Loader2, MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function ForgotForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);
    if (error) {
      setError("메일 발송에 실패했습니다. 잠시 후 다시 시도해주세요.");
      return;
    }
    // 계정 존재 여부는 노출하지 않음 (보안)
    setSent(true);
  }

  if (sent) {
    return (
      <div className="rounded-3xl glass-card p-8 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-accent-soft">
          <MailCheck className="size-7 text-accent-ink" />
        </div>
        <h2 className="mt-4 text-lg font-semibold">메일을 확인해주세요</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          <strong>{email}</strong>(으)로 재설정 링크를 보냈습니다.
          <br />
          메일이 보이지 않으면 스팸함도 확인해주세요.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">이메일</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
          placeholder="가입한 이메일 주소"
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
        disabled={loading || !email.trim()}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-foreground px-6 py-3.5 text-sm font-medium text-background transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
      >
        {loading && <Loader2 className="size-4 animate-spin" />}
        재설정 링크 보내기
      </button>
    </form>
  );
}
