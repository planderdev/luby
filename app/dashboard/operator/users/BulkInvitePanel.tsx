"use client";

import { useState, useTransition } from "react";
import { Loader2, Mail, TriangleAlert } from "lucide-react";
import { resendInviteBulk } from "../actions";

type Result = { sent: number; failed: { name: string; error: string }[]; stopped: boolean };

/**
 * 미로그인 탭 상단 — 목록에 보이는 인원 전체에게 비밀번호 설정(초대) 메일을 일괄 발송.
 * 실제 발송이므로 확인 단계를 한 번 거친다.
 */
export function BulkInvitePanel({ profileIds, names }: { profileIds: string[]; names: string[] }) {
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function send() {
    setError(null);
    startTransition(async () => {
      const r = await resendInviteBulk(profileIds);
      if (r.ok) { setResult({ sent: r.sent, failed: r.failed, stopped: r.stopped }); setConfirming(false); }
      else setError(r.error);
    });
  }

  return (
    <section className="mt-6 rounded-3xl border border-accent/30 bg-accent-soft/40 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-background"><Mail className="size-5 text-accent-ink" /></div>
          <div>
            <h2 className="text-sm font-semibold">초대 메일 일괄 발송 — {profileIds.length}명</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              일괄 등록한 계정은 안내 메일이 나가지 않아 로그인할 방법이 없어요. 비밀번호 설정 링크를 보내면 바로 들어올 수 있습니다.
              {names.length > 0 && <> 예: {names.join(", ")} 외</>}
            </p>
          </div>
        </div>
        {!confirming ? (
          <button type="button" onClick={() => setConfirming(true)} disabled={pending} className="shrink-0 rounded-full bg-foreground px-5 py-2.5 text-xs font-medium text-background disabled:opacity-60">
            {profileIds.length}명에게 보내기
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
          <p className="mt-2 text-muted-foreground">메일을 받은 회원이 로그인하면 이 목록에서 자동으로 빠집니다.</p>
        </div>
      )}
    </section>
  );
}
