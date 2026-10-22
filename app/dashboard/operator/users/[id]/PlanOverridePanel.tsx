"use client";

import { useState, useTransition } from "react";
import { Crown, Loader2 } from "lucide-react";
import { setMemberPlan, type PlanPeriod } from "../../actions";

type Tier = "free" | "business" | "enterprise";

const TIERS: { value: Tier; label: string }[] = [
  { value: "free", label: "FREE" },
  { value: "business", label: "BUSINESS" },
  { value: "enterprise", label: "ENTERPRISE" },
];
const PERIODS: { value: PlanPeriod; label: string }[] = [
  { value: "30", label: "30일" },
  { value: "90", label: "90일" },
  { value: "365", label: "1년" },
  { value: "none", label: "무기한" },
  { value: "date", label: "날짜 지정" },
];

const pill = (on: boolean) =>
  `rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${on ? "border-foreground bg-foreground text-background" : "border-border bg-background hover:bg-muted"}`;

const kstDate = (iso: string) => new Date(iso).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" });

/**
 * 회원 상세 — 총운영관리자 전용 플랜 강제 설정. 결제 없이 플랜·만료일을 바꾸고 사유는 운영 기록에 남는다
 * (광고주 알림에는 사유가 나가지 않음). 권한 검사는 RPC operator_set_plan 이 다시 한다.
 */
export function PlanOverridePanel({
  profileId,
  memberName,
  currentTier,
  currentExpiresAt,
}: {
  profileId: string;
  memberName: string;
  currentTier: Tier;
  currentExpiresAt: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [tier, setTier] = useState<Tier>(currentTier === "free" ? "business" : currentTier);
  const [period, setPeriod] = useState<PlanPeriod>("30");
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [notify, setNotify] = useState(true);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const label = TIERS.find((t) => t.value === tier)!.label;
  const until =
    tier === "free" ? "" : period === "none" ? " · 무기한" : period === "date" ? (date ? ` · ${date}까지` : "") : ` · ${PERIODS.find((p) => p.value === period)!.label}`;
  const ready = reason.trim().length >= 2 && (tier === "free" || period !== "date" || !!date);

  function apply() {
    if (!ready || pending) return;
    if (!window.confirm(`${memberName}님의 플랜을 ${label}${until}(으)로 바꿀까요?\n결제 없이 바로 적용됩니다.`)) return;
    setMsg(null);
    startTransition(async () => {
      const r = await setMemberPlan(profileId, { tier, period, date, reason, notify });
      if (r.ok) {
        setMsg({ ok: true, text: `${r.planName} 플랜을 적용했어요${r.expiresAt ? ` (${kstDate(r.expiresAt)}까지)` : tier === "free" ? "" : " (무기한)"}.${notify ? " 광고주에게 알림을 보냈어요." : ""}` });
        setReason("");
      } else setMsg({ ok: false, text: r.error });
    });
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
        <Crown className="size-3" /> 플랜 강제 설정
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-2xl border border-border bg-muted/30 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-semibold"><Crown className="size-3.5" /> 플랜 강제 설정</p>
        <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-medium text-accent-ink">총운영관리자 전용</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        현재 {currentTier.toUpperCase()}
        {currentTier !== "free" && (currentExpiresAt ? ` · ${kstDate(currentExpiresAt)} 만료` : " · 무기한")}. 결제 없이 바로 바뀌고 운영 기록에 남아요.
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5" role="radiogroup" aria-label="플랜">
        {TIERS.map((t) => (
          <button key={t.value} type="button" role="radio" aria-checked={tier === t.value} onClick={() => setTier(t.value)} className={pill(tier === t.value)}>
            {t.label}
          </button>
        ))}
      </div>

      {tier !== "free" && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label="이용 기간">
          {PERIODS.map((p) => (
            <button key={p.value} type="button" role="radio" aria-checked={period === p.value} onClick={() => setPeriod(p.value)} className={pill(period === p.value)}>
              {p.label}
            </button>
          ))}
          {period === "date" && (
            <input
              type="date"
              value={date}
              min={new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)}
              onChange={(e) => setDate(e.target.value)}
              aria-label="만료일"
              className="rounded-full border border-border bg-background px-3 py-1.5 text-xs outline-none focus:border-foreground/40"
            />
          )}
        </div>
      )}

      <input
        type="text"
        value={reason}
        maxLength={200}
        onChange={(e) => setReason(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") apply(); }}
        placeholder="변경 사유(필수) — 예: 파트너 무상 제공, 결제 테스트"
        aria-label="변경 사유"
        className="mt-3 w-full rounded-full border border-border bg-background px-4 py-2 text-sm outline-none focus:border-foreground/40"
      />
      <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
        <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="size-3.5" />
        광고주에게 알림 보내기(사유는 보이지 않아요)
      </label>

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={apply}
          disabled={!ready || pending}
          className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-xs font-medium text-background disabled:opacity-50"
        >
          {pending && <Loader2 className="size-3.5 animate-spin" />} {label}
          {until} 적용
        </button>
        <button type="button" onClick={() => { setOpen(false); setMsg(null); }} className="rounded-full px-3 py-2 text-xs text-muted-foreground hover:bg-muted">
          닫기
        </button>
      </div>
      {msg && <p className={`mt-2 text-xs ${msg.ok ? "text-success" : "text-accent-ink"}`}>{msg.text}</p>}
    </div>
  );
}
