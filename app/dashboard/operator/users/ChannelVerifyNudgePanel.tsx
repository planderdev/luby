"use client";

import { useState, useTransition } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { sendChannelVerifyNudges } from "../actions";

/**
 * 인플루언서 탭 — 미인증 채널이 있는 승인 크리에이터에게 '채널 본인 인증' 안내를 보낸다(운영자 클릭, 실제 발송이라 확인 단계).
 * 대상 수는 서버가 운영자 RPC 를 미리보기(발송 없음)로 계산한 값. 같은 사람에게는 30일 안에 다시 가지 않는다.
 */
export function ChannelVerifyNudgePanel({ targets, sampleNames }: { targets: number; sampleNames: string[] }) {
  const [confirming, setConfirming] = useState(false);
  const [sent, setSent] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function send() {
    setError(null);
    startTransition(async () => {
      const r = await sendChannelVerifyNudges();
      if (r.ok) {
        setSent(r.sent);
        setConfirming(false);
      } else setError(r.error);
    });
  }

  return (
    <section className="mt-4 rounded-3xl border border-border bg-muted/30 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-background"><ShieldCheck className="size-5" /></div>
          <div>
            <h2 className="text-sm font-semibold">채널 인증 안내 — 대상 {sent === null ? targets : 0}명</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              승인된 크리에이터 중 아직 인증하지 않은 채널이 있는 사람에게 ‘채널 본인 인증’ 방법을 알림(앱·푸시·이메일)으로 보냅니다. 인증 확인 중인 사람·30일 안에 받은 사람·데모 계정은 빠져요.
              이메일은 ‘리마인더 · 추천’ 수신 설정을 따르고, 영문·중문 크리에이터에게는 그 언어로 갑니다.
              {sampleNames.length > 0 && <> 예: {sampleNames.join(", ")}{targets > sampleNames.length ? " 외" : ""}</>}
            </p>
          </div>
        </div>
        {sent === null && targets > 0 && (!confirming ? (
          <button type="button" onClick={() => setConfirming(true)} disabled={pending} className="shrink-0 rounded-full bg-foreground px-5 py-2.5 text-xs font-medium text-background disabled:opacity-60">
            안내 보내기
          </button>
        ) : (
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-xs text-muted-foreground">{targets}명에게 실제 알림·메일이 발송됩니다.</span>
            <button type="button" onClick={() => setConfirming(false)} disabled={pending} className="rounded-full px-3 py-2 text-xs hover:bg-background/60">취소</button>
            <button type="button" onClick={send} disabled={pending} className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-5 py-2.5 text-xs font-medium text-background disabled:opacity-60">
              {pending && <Loader2 className="size-3.5 animate-spin" />} 발송 확인
            </button>
          </div>
        ))}
      </div>
      {error && <p className="mt-3 text-xs text-danger">{error}</p>}
      {sent !== null && (
        <p className="mt-4 rounded-2xl bg-background px-4 py-3 text-xs">
          <b>{sent}명</b>에게 보냈어요. 인증 요청이 들어오면 회원 관리 맨 위 ‘채널 인증 요청’에 보입니다.
        </p>
      )}
    </section>
  );
}
