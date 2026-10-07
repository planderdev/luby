"use client";

import { useState, useTransition } from "react";
import { Loader2, Megaphone } from "lucide-react";
import { sendOpenCampaignNudges } from "../actions";

/**
 * 인플루언서 탭 상단 — 승인 크리에이터에게 '내 채널에 맞는 모집 중 캠페인' 안내를 보낸다(운영자 클릭, 실제 발송이라 확인 단계).
 * 미리보기 수치는 서버가 운영자 전용 RPC 로 계산한 값(발송 없음). 같은 사람에게는 14일 안에 다시 가지 않는다.
 */
export function OpenCampaignNudgePanel({ targets, sampleNames, sampleBody }: { targets: number; sampleNames: string[]; sampleBody: string | null }) {
  const [confirming, setConfirming] = useState(false);
  const [sent, setSent] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function send() {
    setError(null);
    startTransition(async () => {
      const r = await sendOpenCampaignNudges();
      if (r.ok) { setSent(r.sent); setConfirming(false); }
      else setError(r.error);
    });
  }

  return (
    <section className="mt-6 rounded-3xl border border-accent/30 bg-accent-soft/40 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-background"><Megaphone className="size-5 text-accent-ink" /></div>
          <div>
            <h2 className="text-sm font-semibold">모집 중 캠페인 안내 — 대상 {sent === null ? targets : 0}명</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              승인된 크리에이터 중 내 채널 종류·분야·지역에 맞는 모집 중 캠페인이 있는데 아직 응모하지 않은 사람에게 알림(앱·푸시·이메일)을 보냅니다.
              최근 7일 안에 새 캠페인 알림을 받았거나 14일 안에 이 안내를 받은 사람은 제외돼요. 이메일은 '리마인더 · 추천' 수신 설정을 따릅니다.
              {sampleNames.length > 0 && <> 예: {sampleNames.join(", ")} 외</>}
            </p>
            {sampleBody && <p className="mt-2 rounded-xl bg-background px-3 py-2 text-xs text-foreground">예시 본문: {sampleBody}</p>}
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
        <div className="mt-4 rounded-2xl bg-background px-4 py-3 text-xs">
          <p className="font-medium">{sent}명에게 발송했어요.</p>
          <p className="mt-1 text-muted-foreground">응모가 들어오면 캠페인 상세의 응모자 목록에 바로 보입니다. 같은 사람에게는 14일 뒤부터 다시 보낼 수 있어요.</p>
        </div>
      )}
    </section>
  );
}
