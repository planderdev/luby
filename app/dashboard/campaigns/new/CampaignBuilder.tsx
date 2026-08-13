"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Loader2, Save } from "lucide-react";
import { createCampaign, type CampaignDraft } from "./actions";
import { Step1Basic } from "./steps/Step1Basic";
import { Step2Promotion } from "./steps/Step2Promotion";
import { Step3Schedule } from "./steps/Step3Schedule";
import { Step4Recruit } from "./steps/Step4Recruit";
import { Step5Offering } from "./steps/Step5Offering";

export type Region = { id: string; code: string; name: string; flag: string };
export type Category = { id: string; slug: string; name: string; emoji: string | null };
export type Channel = { id: string; slug: string; name: string };
export type PromotionType = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  required_fields: string[];
};

const STEPS = [
  { n: 1, label: "기본정보" },
  { n: 2, label: "홍보·채널" },
  { n: 3, label: "체험 일정" },
  { n: 4, label: "체험단 설정" },
  { n: 5, label: "제공내역·포인트" },
] as const;

const initialDraft = (regionId: string): CampaignDraft => ({
  title: "",
  business_name: "",
  industry_brief: "",
  thumbnail_url: "",
  contact_phone: "",
  region_id: regionId,
  promotion_type_id: "",
  category_id: "",
  channel_type_ids: [],
  missions: [],
  recruit_start: "",
  recruit_end: "",
  experience_start: null,
  experience_end: null,
  same_day_reservation: false,
  always_open: false,
  schedules: [],
  recruit_count: 1,
  keywords: [],
  offerings: [],
  point_amount: 0,
});

export function CampaignBuilder({
  regions,
  categories,
  channels,
  promotionTypes,
}: {
  regions: Region[];
  categories: Category[];
  channels: Channel[];
  promotionTypes: PromotionType[];
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  // Empty region_id forces the user to pick from the dropdown — matches the
  // behavior of the other Step 2 selects (promotion type, category) so the UX
  // is consistent. canProceed() enforces it before moving to Step 2.
  const [draft, setDraft] = useState<CampaignDraft>(() => initialDraft(""));
  const [error, setError] = useState<string | null>(null);
  const [modalError, setModalError] = useState<{ step: number; error: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function update<K extends keyof CampaignDraft>(key: K, value: CampaignDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function applyPatch(patch: Partial<CampaignDraft>) {
    setDraft((d) => ({ ...d, ...patch }));
  }

  /** Called by Step 1 when "AI에게 전부 맡기기" finishes */
  function applySuperAndJump(patch: Partial<CampaignDraft>) {
    // 모집 기간은 광고주가 직접 정해야 하는 필수값 — AI가 임의로 채우지 않는다.
    // 비어있으면 저장 시 모달로 안내하고 Step 3로 이동시킨다.
    applyPatch(patch);
    setError(null);
    setStep(5);
  }

  function validateStep(s: number): string | null {
    if (s === 1) {
      if (!draft.title.trim()) return "캠페인 제목을 입력해주세요.";
      if (!draft.business_name.trim()) return "상호명을 입력해주세요.";
      if (!draft.region_id) return "활동 지역을 선택해주세요.";
    }
    if (s === 2) {
      if (!draft.promotion_type_id) return "홍보유형을 선택해주세요.";
      if (!draft.category_id) return "카테고리를 선택해주세요.";
      if (draft.channel_type_ids.length === 0) return "최소 1개 채널을 선택해주세요.";
    }
    if (s === 3) {
      if (!draft.recruit_start || !draft.recruit_end) return "체험단 모집기간은 필수입니다.";
      if (new Date(draft.recruit_start) >= new Date(draft.recruit_end))
        return "모집 종료일은 시작일 이후여야 합니다.";
    }
    if (s === 4) {
      if (draft.recruit_count < 1) return "모집 인원은 1명 이상이어야 합니다.";
    }
    return null;
  }

  function canProceed(): string | null {
    return validateStep(step);
  }

  // 저장·검수요청은 현재 스텝만이 아니라 전체 스텝을 검증 —
  // AI 전부 맡기기로 Step 5에 바로 점프한 경우에도 빠진 항목을 잡아낸다.
  function validateAll(): { step: number; error: string } | null {
    for (let s = 1; s <= 4; s++) {
      const err = validateStep(s);
      if (err) return { step: s, error: err };
    }
    return null;
  }

  function next() {
    const err = canProceed();
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setStep((s) => Math.min(5, s + 1));
  }

  function prev() {
    setError(null);
    setStep((s) => Math.max(1, s - 1));
  }

  function save(submit: boolean) {
    const invalid = validateAll();
    if (invalid) {
      // 모달로 안내 → 확인 시 해당 스텝으로 이동
      setModalError(invalid);
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await createCampaign(draft, submit);
      if (result.ok) {
        router.push(`/dashboard/campaigns/${result.id}`);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href="/dashboard/campaigns"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            캠페인 목록
          </Link>
          <h1 className="display mt-2 text-3xl font-semibold lg:text-4xl">새 캠페인</h1>
        </div>
      </header>

      <StepIndicator
        current={step}
        onSelect={(s) => {
          setError(null);
          setStep(s);
        }}
      />

      <div className="mt-8 rounded-3xl glass-card p-6 lg:p-10">
        {step === 1 && (
          <Step1Basic
            draft={draft}
            regions={regions}
            update={update}
            applySuper={applySuperAndJump}
          />
        )}
        {step === 2 && (
          <Step2Promotion
            draft={draft}
            categories={categories}
            channels={channels}
            promotionTypes={promotionTypes}
            update={update}
            applyPatch={applyPatch}
          />
        )}
        {step === 3 && <Step3Schedule draft={draft} update={update} />}
        {step === 4 && (
          <Step4Recruit draft={draft} update={update} applyPatch={applyPatch} />
        )}
        {step === 5 && (
          <Step5Offering draft={draft} update={update} applyPatch={applyPatch} />
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-2xl border border-accent/30 bg-accent-soft px-4 py-3 text-sm text-accent-ink">
          {error}
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={prev}
          disabled={step === 1 || pending}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-5 py-2.5 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
        >
          <ArrowLeft className="size-4" />
          이전
        </button>

        <div className="flex items-center gap-2">
          {step === 5 ? (
            <>
              <button
                type="button"
                onClick={() => save(false)}
                disabled={pending}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-5 py-2.5 text-sm font-medium hover:bg-muted disabled:opacity-50"
              >
                {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                초안 저장
              </button>
              <button
                type="button"
                onClick={() => save(true)}
                disabled={pending}
                className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background disabled:opacity-50"
              >
                {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                검수 요청
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={next}
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background"
            >
              다음
              <ArrowRight className="size-4" />
            </button>
          )}
        </div>
      </div>

      {/* 필수값 누락 안내 모달 — 확인 시 해당 스텝으로 이동 */}
      {modalError && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setModalError(null)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            className="w-full max-w-sm rounded-3xl glass-card p-6 text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-accent-soft">
              <span className="text-xl">⚠️</span>
            </div>
            <h3 className="mt-4 text-lg font-semibold">{modalError.error}</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              STEP {modalError.step}에서 입력을 완료한 뒤 다시 시도해주세요.
            </p>
            <button
              type="button"
              onClick={() => {
                setStep(modalError.step);
                setError(null);
                setModalError(null);
              }}
              className="mt-6 w-full rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background hover:bg-foreground/90"
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StepIndicator({
  current,
  onSelect,
}: {
  current: number;
  onSelect: (step: number) => void;
}) {
  return (
    <div className="mt-8 flex flex-wrap gap-2">
      {STEPS.map((s) => {
        const state =
          s.n < current ? "done" : s.n === current ? "active" : "pending";
        return (
          <button
            key={s.n}
            type="button"
            onClick={() => onSelect(s.n)}
            className={`flex flex-1 min-w-[140px] items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors hover:border-foreground/40 ${
              state === "active"
                ? "border-foreground bg-muted"
                : state === "done"
                  ? "border-border bg-background"
                  : "border-border bg-background"
            }`}
          >
            <span
              className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                state === "active"
                  ? "bg-foreground text-background"
                  : state === "done"
                    ? "bg-accent text-background"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {state === "done" ? <Check className="size-3.5" /> : s.n}
            </span>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Step {s.n}
              </div>
              <div className="text-sm font-medium">{s.label}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
