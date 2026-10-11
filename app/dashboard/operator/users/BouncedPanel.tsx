"use client";

import { useState, useTransition } from "react";
import { Loader2, MailX, RefreshCw } from "lucide-react";
import { syncSuppressionsNow } from "../actions";

/**
 * 회원 관리 '메일 반송' 탭 상단 안내. 반송 주소는 Resend 가 차단해 어떤 메일도 닿지 않는다 —
 * 회원 상세에서 실제 이메일로 바꾸는 것이 유일한 해결이다. 차단 목록은 매일 09:10 자동 동기화, 여기서 즉시 동기화.
 */
export function BouncedPanel({ count, advertisersWithCampaigns }: { count: number; advertisersWithCampaigns: number }) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function sync() {
    setMsg(null);
    startTransition(async () => {
      const r = await syncSuppressionsNow();
      setMsg(r.ok ? `동기화 완료 — Resend 차단 목록 ${r.total}건${r.removed ? ` · 해제 반영 ${r.removed}건` : ""}` : r.error);
    });
  }

  return (
    <section className="mt-6 rounded-3xl border border-accent/30 bg-accent-soft/40 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-background"><MailX className="size-5 text-accent-ink" /></div>
          <div>
            <h2 className="text-sm font-semibold">메일 반송 회원 — {count}명</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              없는 주소로 반송돼 Resend 가 이 주소로 가는 메일을 모두 막고 있어요. 초대·인증·알림 메일이 닿지 않으니, 회원 상세에서 실제 이메일로 바꿔 주세요.
              {advertisersWithCampaigns > 0 && (
                <> 캠페인이 있는 광고주 {advertisersWithCampaigns}명은 응모·제출·메시지가 오면 운영자에게 &lsquo;[대신 확인]&rsquo; 알림이 함께 갑니다.</>
              )}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={sync}
          disabled={pending}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-background px-4 py-2 text-xs font-medium hover:bg-muted disabled:opacity-60"
        >
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />} 지금 동기화
        </button>
      </div>
      {msg && <p className="mt-3 text-xs text-muted-foreground">{msg}</p>}
    </section>
  );
}
