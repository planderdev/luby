"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, X } from "lucide-react";
import { approveChannelVerification, rejectChannelVerification } from "../actions";
import { CHANNEL_REJECT_REASONS } from "@/lib/channels/reject-reasons";

/** 채널 인증 요청 한 건 — 팔로워 확정 후 승인, 또는 사유와 함께 반려(사유는 크리에이터 알림으로 감) */
export function ChannelVerifyItem({ channelId, claimed }: { channelId: string; claimed: number }) {
  const router = useRouter();
  const [count, setCount] = useState(claimed);
  const [reason, setReason] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<{ ok: true } | { ok: false; error: string }>) => {
    setError(null);
    startTransition(async () => {
      const r = await fn();
      if (r.ok) router.refresh();
      else setError(r.error);
    });
  };

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
      {!rejecting ? (
        <>
          <label className="flex items-center gap-1.5">
            확인한 팔로워
            <input type="number" min={0} value={count || ""} onChange={(e) => setCount(Number(e.target.value || 0))} className="w-28 rounded-full border border-border px-3 py-1 outline-none" />
          </label>
          <button type="button" disabled={pending} onClick={() => run(() => approveChannelVerification(channelId, count))} className="inline-flex items-center gap-1 rounded-full bg-foreground px-3 py-1 font-medium text-background disabled:opacity-50">
            {pending ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />} 승인
          </button>
          <button type="button" disabled={pending} onClick={() => setRejecting(true)} className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 hover:bg-muted">
            <X className="size-3" /> 반려
          </button>
        </>
      ) : (
        <>
          <div className="flex w-full flex-wrap gap-1">
            {CHANNEL_REJECT_REASONS.map((r) => (
              <button key={r.ko} type="button" onClick={() => setReason(r.ko)} className={`rounded-full border px-2.5 py-0.5 ${reason === r.ko ? "border-foreground bg-foreground text-background" : "border-border hover:bg-muted"}`}>
                {r.ko}
              </button>
            ))}
          </div>
          <input value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} placeholder="반려 사유 — 예: 캡처에 인증 코드가 안 보여요" className="min-w-0 flex-1 rounded-full border border-border px-3 py-1 outline-none sm:max-w-sm" />
          <button type="button" disabled={pending || reason.trim().length < 2} onClick={() => run(() => rejectChannelVerification(channelId, reason))} className="inline-flex items-center gap-1 rounded-full bg-foreground px-3 py-1 font-medium text-background disabled:opacity-50">
            {pending && <Loader2 className="size-3 animate-spin" />} 반려하기
          </button>
          <button type="button" onClick={() => setRejecting(false)} className="rounded-full px-2 py-1 hover:bg-muted">취소</button>
        </>
      )}
      {error && <span className="text-danger">{error}</span>}
    </div>
  );
}
