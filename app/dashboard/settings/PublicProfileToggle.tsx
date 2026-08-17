"use client";

import { useState, useTransition } from "react";
import { Globe, Link2, Check, Loader2, ExternalLink } from "lucide-react";
import { setPublicProfile } from "./actions";

export function PublicProfileToggle({ userId, initial, approved }: { userId: string; initial: boolean; approved: boolean }) {
  const [on, setOn] = useState(initial);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const url = `${origin}/p/${userId}`;

  function toggle() {
    const next = !on;
    setOn(next);
    setError(null);
    startTransition(async () => {
      const r = await setPublicProfile(next);
      if (!r.ok) {
        setOn(!next);
        setError(r.error);
      }
    });
  }
  async function copy() {
    try { await navigator.clipboard.writeText(url); } catch { /* noop */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <section id="public" className="scroll-mt-24 rounded-3xl glass-card p-6 lg:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold"><Globe className="size-4" /> 공개 프로필</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            켜면 로그인 없이 볼 수 있는 내 프로필 페이지가 생겨요. 이름·사진·소개·지역·분야·채널·완료한 협업만 표시되고, 이메일·연락처·정산 정보는 절대 공개되지 않습니다.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          onClick={toggle}
          disabled={pending || !approved}
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? "bg-accent" : "bg-muted"} disabled:opacity-50`}
        >
          <span className={`absolute top-0.5 size-5 rounded-full bg-background shadow transition-transform ${on ? "translate-x-5" : "translate-x-0.5"}`} />
        </button>
      </div>
      {!approved && <p className="mt-3 text-xs text-muted-foreground">계정 승인 후 켤 수 있어요.</p>}
      {on && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <code className="rounded-xl bg-muted px-3 py-2 text-xs">{url}</code>
          <button type="button" onClick={copy} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs hover:bg-muted">
            {copied ? <Check className="size-3.5 text-success" /> : <Link2 className="size-3.5" />} {copied ? "복사됨" : "링크 복사"}
          </button>
          <a href={`/p/${userId}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ExternalLink className="size-3.5" /> 미리보기
          </a>
          <span className="text-[11px] text-muted-foreground">
            해외용: <a href={`/en/p/${userId}`} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">EN</a> · <a href={`/zh/p/${userId}`} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">中文</a>
          </span>
        </div>
      )}
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
      {pending && <Loader2 className="mt-2 size-4 animate-spin text-muted-foreground" />}
    </section>
  );
}
