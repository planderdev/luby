"use client";

import { useState, useTransition } from "react";
import { Loader2, MailCheck, TriangleAlert } from "lucide-react";
import { resendConfirmationBulk } from "../actions";

type Result = { sent: number; failed: { name: string; error: string }[]; stopped: boolean };

/**
 * 미로그인 탭 상단 — 가입은 했지만 이메일 인증 링크를 안 누른 회원에게 가입 인증 메일을 다시 보낸다.
 * (초대 메일 패널과 분리: 미인증 계정에 비밀번호 설정 메일을 보내면 엉뚱한 흐름이 된다) 실제 발송이므로 확인 단계를 거친다.
 */
export function BulkConfirmPanel({ profileIds, names }: { profileIds: string[]; names: string[] }) {
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function send() {
    setError(null);
    startTransition(async () => {
      const r = await resendConfirmationBulk(profileIds);
      if (r.ok) { setResult({ sent: r.sent, failed: r.failed, stopped: r.stopped }); setConfirming(false); }
      else setError(r.error);
    });
  }

  return (
    <section className="mt-6 rounded-3xl border border-warning/40 bg-warning-soft/40 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-background"><MailCheck className="size-5 text-warning" /></div>
          <div>
            <h2 className="text-sm font-semibold">이메일 미인증 가입자 — {profileIds.length}명</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              직접 가입했지만 인증 링크를 누르지 않아 로그인하지 못한 회원이에요. 가입 인증 메일을 다시 보내면 링크 한 번으로 바로 시작할 수 있습니다.
              (2026-10-07 이후 가입자는 24시간 뒤 자동으로 1회 발송돼요.)
              {names.length > 0 && <> 예: {names.join(", ")} 외</>}
            </p>
          </div>
        </div>
        {!confirming ? (
          <button type="button" onClick={() => setConfirming(true)} disabled={pending} className="shrink-0 rounded-full bg-foreground px-5 py-2.5 text-xs font-medium text-background disabled:opacity-60">
            인증 메일 다시 보내기
          </button>
        ) : (
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-xs text-muted-foreground">실제 메일이 발송됩니다.</span>
            <button type="button" onClick={() => setConfirming(false)} disabled={pending} className="rounded-full px-3 py-2 text-xs hover:bg-background/60">취소</button>
            <button type="button" onClick={send} disabled={pending} className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-5 py-2.5 text-xs font-medium text-background disabled:opacity-60">
              {pending && <Loader2 className="size-3.5 animate-spin" />} 발송 확인
            </button>
          </div>
        )}
      </div>

      {error && <p className="mt-3 text-xs text-danger">{error}</p>}
      {result && (
        <div className="mt-4 rounded-2xl bg-background px-4 py-3 text-xs">
          <p className="font-medium">{result.sent}건 발송 완료{result.failed.length > 0 && ` · ${result.failed.length}건 실패`}</p>
          {result.stopped && (
            <p className="mt-1 flex items-center gap-1.5 text-warning"><TriangleAlert className="size-3.5" /> 메일 발송 한도에 걸려 중단했어요. 잠시 후 남은 인원에게 다시 보내주세요.</p>
          )}
          {result.failed.slice(0, 5).map((f, i) => (
            <p key={i} className="mt-1 text-muted-foreground">{f.name} — {f.error}</p>
          ))}
          <p className="mt-2 text-muted-foreground">회원이 인증 링크를 누르면 이 목록에서 자동으로 빠집니다.</p>
        </div>
      )}
    </section>
  );
}
