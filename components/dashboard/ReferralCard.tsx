"use client";

import { useState } from "react";
import { Check, Copy, Gift, Share2 } from "lucide-react";

/** 크리에이터 홈 — 내 추천 링크(/creators?ref=) 복사·공유 + 추천 현황 */
export function ReferralCard({ profileId, total, rewarded, rewardPoints, monthRewarded }: { profileId: string; total: number; rewarded: number; rewardPoints: number; monthRewarded: number }) {
  const [copied, setCopied] = useState(false);
  // 서버/클라이언트 동일 값(빌드 상수) — window 분기는 하이드레이션 불일치를 만든다
  const link = `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://luby.im"}/creators?ref=${profileId}`;
  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = link;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: "루비AI 크리에이터", text: "내 채널로 체험하고 포인트로 정산받는 루비AI, 같이 해요!", url: link });
        return;
      } catch {
        /* 취소 */
      }
    }
    copy();
  }
  return (
    <section className="mt-8 rounded-3xl glass-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft"><Gift className="size-5 text-accent-ink" /></div>
          <div>
            <h2 className="text-base font-semibold tracking-tight">친구 초대하고 500P</h2>
            <p className="mt-1 text-sm text-muted-foreground">내 링크로 가입한 친구가 첫 체험을 완료하면 500P (월 5명까지).</p>
            <p className="mt-1 text-xs text-muted-foreground">
              가입 <b className="text-foreground">{total}</b>명 · 보상 <b className="text-foreground">{rewarded}</b>건 · 적립 <b className="text-foreground">{rewardPoints.toLocaleString()}P</b>
              {monthRewarded >= 5 ? " · 이번 달 상한 도달" : ` · 이번 달 ${monthRewarded}/5`}
            </p>
          </div>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <code className="min-w-0 flex-1 truncate rounded-xl border border-border bg-background px-3 py-2 text-xs text-muted-foreground sm:max-w-[260px]">{link.replace(/^https?:\/\//, "")}</code>
          <button type="button" onClick={copy} className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-xs font-medium text-background">
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />} {copied ? "복사됨" : "복사"}
          </button>
          <button type="button" onClick={share} aria-label="공유" className="inline-flex shrink-0 items-center justify-center rounded-full border border-border bg-background p-2 hover:bg-muted">
            <Share2 className="size-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
