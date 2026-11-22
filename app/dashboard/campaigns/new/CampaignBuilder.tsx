"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Loader2, Save, Wand2 } from "lucide-react";
import { aiErrorMessage } from "@/lib/ai/ai-errors";
import { EMPTY_GUIDE } from "@/lib/campaign-guide";
import { createCampaign, updateCampaign, type CampaignDraft } from "./actions";
import { suggestEverything } from "./ai-actions";
import { StepAbout } from "./steps/StepAbout";
import { StepOffer } from "./steps/StepOffer";
import { StepPoints } from "./steps/StepPoints";
import { StepReview } from "./steps/StepReview";

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

/** 질문 3개 + 확인. 사장님만 아는 사실은 묻고(1~3), AI 가 정할 수 있는 것은 4에서 확인만 받는다 */
const STEPS = [
  { n: 1, kicker: "질문 1", label: "무엇을 알리나요" },
  { n: 2, kicker: "질문 2", label: "무엇을 드리나요" },
  { n: 3, kicker: "질문 3", label: "꼭 담을 것 · 피할 것" },
  { n: 4, kicker: "확인", label: "AI 가이드" },
] as const;
const REVIEW = 4;

/** 바뀌면 이미 만든 가이드가 낡는 답변들 */
const FACT_KEYS: (keyof CampaignDraft)[] = ["business_name", "industry_brief", "region_id", "promotion_type_id", "offerings", "guide"];

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
  guide: EMPTY_GUIDE,
});

export function CampaignBuilder({
  regions,
  categories,
  channels,
  promotionTypes,
  initial,
  editId = null,
  onBehalfOf = null,
  reviewNote = null,
  fromId = null,
}: {
  regions: Region[];
  categories: Category[];
  channels: Channel[];
  promotionTypes: PromotionType[];
  /** 캠페인 복제 시 프리필 값 (일정은 비워서 광고주가 새로 지정) */
  initial?: Partial<CampaignDraft> | null;
  /** 수정 모드: 기존 캠페인 id (초안·검수중·반려 상태) */
  editId?: string | null;
  /** 운영자 대행 등록: 광고주 id·표시명 */
  onBehalfOf?: { id: string; label: string } | null;
  /** 반려된 캠페인 수정 시 운영자 수정 요청 사항 (빌더 상단에 고정 표시) */
  reviewNote?: string | null;
  /** 복제 원본 캠페인 id (성과 반영 리프레시용) */
  fromId?: string | null;
}) {
  const router = useRouter();
  // Empty region_id forces the user to pick from the dropdown.
  const [draft, setDraft] = useState<CampaignDraft>(() => ({ ...initialDraft(""), ...(initial ?? {}) }));
  // 수정·복제는 이미 가이드가 있으므로 확인 화면에서 시작한다
  const [step, setStep] = useState(() => ((initial?.channel_type_ids?.length ?? 0) > 0 ? REVIEW : 1));
  const [error, setError] = useState<string | null>(null);
  const [modalError, setModalError] = useState<{ step: number; error: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const [generating, startGenerate] = useTransition();
  const [aiError, setAiError] = useState<string | null>(null);
  const [changes, setChanges] = useState<string[]>([]);
  const [stale, setStale] = useState(false);

  const hasGuide = draft.channel_type_ids.length > 0 || draft.title.trim().length > 0;

  function update<K extends keyof CampaignDraft>(key: K, value: CampaignDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
    if (hasGuide && FACT_KEYS.includes(key)) setStale(true);
  }

  function validateStep(s: number): string | null {
    // 예전 방식으로 만든 캠페인(설명·제공 내역이 비어 있을 수 있음)의 수정은 막지 않는다
    const strict = !editId;
    if (s === 1) {
      if (!draft.business_name.trim()) return "상호명을 입력해주세요.";
      if (!draft.region_id) return "활동 지역을 선택해주세요.";
      if (strict && draft.industry_brief.trim().length < 10) return "어떤 곳(제품)인지 한두 문장으로 적어주세요.";
    }
    if (s === 2) {
      if (!draft.promotion_type_id) return "체험 방식을 선택해주세요.";
      if (strict && !draft.offerings.some((o) => o.title.trim())) return "제공 내역을 1개 이상 적어주세요.";
      if (!draft.recruit_start || !draft.recruit_end) return "모집 기간을 정해주세요.";
      if (new Date(draft.recruit_start) >= new Date(draft.recruit_end)) return "모집 종료일은 시작일 이후여야 합니다.";
    }
    if (s === REVIEW) {
      if (!hasGuide) return "AI 가이드를 먼저 만들어주세요.";
      if (!draft.title.trim()) return "캠페인 제목을 입력해주세요.";
      if (draft.channel_type_ids.length === 0) return "콘텐츠를 올릴 채널을 1개 이상 골라주세요.";
      if (!draft.category_id) return "카테고리를 선택해주세요. (분류·연락처)";
      if (draft.recruit_count < 1) return "모집 인원은 1명 이상이어야 합니다.";
    }
    return null;
  }

  function validateUpTo(last: number): { step: number; error: string } | null {
    for (let s = 1; s <= last; s++) {
      const err = validateStep(s);
      if (err) return { step: s, error: err };
    }
    return null;
  }

  /** 질문 1~3의 답으로 가이드 전체를 만든다. 제공 내역·체험 방식은 답한 그대로 둔다 */
  function generate(withHistory = false) {
    const invalid = validateUpTo(2);
    if (invalid) {
      setModalError(invalid);
      return;
    }
    if (hasGuide && !window.confirm("가이드를 새로 만들면 제목·채널·해야 할 일·키워드·인원·포인트가 새 제안으로 바뀝니다. 계속할까요?")) return;
    setError(null);
    setAiError(null);
    setChanges([]);
    setStep(REVIEW);
    startGenerate(async () => {
      let r: Awaited<ReturnType<typeof suggestEverything>>;
      try {
        r = await suggestEverything({
          industryBrief: draft.industry_brief,
          businessName: draft.business_name,
          fromCampaignId: withHistory ? fromId : null,
          facts: {
            promotionTypeId: draft.promotion_type_id,
            regionId: draft.region_id,
            offerings: draft.offerings,
            mustInclude: draft.guide.must_include,
            avoid: draft.guide.avoid,
            referenceUrl: draft.guide.reference_url,
            experiencePeriod:
              draft.experience_start || draft.experience_end
                ? `${(draft.experience_start ?? "").slice(0, 10)} ~ ${(draft.experience_end ?? "").slice(0, 10)}`
                : null,
          },
        });
      } catch (e) {
        setAiError(aiErrorMessage(e, "AI 호출 중 오류가 발생했습니다."));
        return;
      }
      if (!r.ok) {
        setAiError(r.error);
        return;
      }
      const d = r.data;
      setDraft((prev) => ({
        ...prev,
        title: d.title,
        category_id: d.category_id,
        channel_type_ids: d.channel_type_ids,
        missions: d.missions.filter((m) => d.channel_type_ids.includes(m.channel_type_id)),
        keywords: d.keywords,
        recruit_count: d.recruit_count,
        point_amount: d.point_amount,
      }));
      setChanges(d.changes ?? []);
      setStale(false);
    });
  }

  function next() {
    const err = validateStep(step);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    if (step === REVIEW - 1 && !hasGuide) {
      generate(false);
      return;
    }
    setStep((s) => Math.min(REVIEW, s + 1));
  }

  function prev() {
    setError(null);
    setStep((s) => Math.max(1, s - 1));
  }

  function save(submit: boolean) {
    const invalid = validateUpTo(REVIEW);
    if (invalid) {
      // 모달로 안내 → 확인 시 해당 단계로 이동
      setModalError(invalid);
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = editId ? await updateCampaign(editId, draft, submit) : await createCampaign(draft, submit, onBehalfOf?.id ?? null);
      if (result.ok) {
        router.push(`/dashboard/campaigns/${result.id}`);
        if (editId) router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  const busy = pending || generating;

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
          <h1 className="display mt-2 text-3xl font-semibold lg:text-4xl">{editId ? "캠페인 수정" : onBehalfOf ? "운영자 대행 캠페인" : "새 캠페인"}</h1>
          {!editId && (
            <p className="mt-2 text-sm text-muted-foreground">질문 3개에 답하면 AI가 크리에이터용 가이드를 만들어 드려요.</p>
          )}
          {onBehalfOf && (
            <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent-ink">
              {onBehalfOf.label} 광고주 명의로 작성 중 · "검수 요청"을 누르면 바로 모집이 시작됩니다
            </p>
          )}
          {reviewNote && (
            <div className="mt-3 max-w-2xl rounded-2xl border border-danger/30 bg-danger-soft/30 px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-danger">운영팀 수정 요청 사항</div>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{reviewNote}</p>
            </div>
          )}
        </div>
      </header>

      <StepIndicator
        current={step}
        onSelect={(s) => {
          if (generating) return;
          setError(null);
          setStep(s);
        }}
      />

      <div className="mt-8 rounded-3xl glass-card p-6 lg:p-10">
        {step === 1 && <StepAbout draft={draft} regions={regions} update={update} />}
        {step === 2 && <StepOffer draft={draft} promotionTypes={promotionTypes} update={update} />}
        {step === 3 && <StepPoints draft={draft} promotionTypes={promotionTypes} update={update} />}
        {step === REVIEW && (
          <StepReview
            draft={draft}
            categories={categories}
            channels={channels}
            promotionTypes={promotionTypes}
            update={update}
            generating={generating}
            aiError={aiError}
            changes={changes}
            stale={stale}
            canRefresh={!!fromId}
            onGenerate={generate}
            onEdit={(s) => {
              setError(null);
              setStep(s);
            }}
          />
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
          disabled={step === 1 || busy}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-5 py-2.5 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
        >
          <ArrowLeft className="size-4" />
          이전
        </button>

        <div className="flex items-center gap-2">
          {step === REVIEW ? (
            hasGuide && (
              <>
                <button
                  type="button"
                  onClick={() => save(false)}
                  disabled={busy}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-5 py-2.5 text-sm font-medium hover:bg-muted disabled:opacity-50"
                >
                  {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                  초안 저장
                </button>
                <button
                  type="button"
                  onClick={() => save(true)}
                  disabled={busy}
                  className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background disabled:opacity-50"
                >
                  {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                  {reviewNote ? "다시 검수 요청" : "검수 요청"}
                </button>
              </>
            )
          ) : (
            <button
              type="button"
              onClick={next}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background disabled:opacity-50"
            >
              {step === REVIEW - 1 && !hasGuide ? (
                <>
                  <Wand2 className="size-4" />
                  AI 가이드 만들기
                </>
              ) : (
                <>
                  다음
                  <ArrowRight className="size-4" />
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* 필수값 누락 안내 모달 — 확인 시 해당 단계로 이동 */}
      {modalError && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setModalError(null)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            className="w-full max-w-sm rounded-3xl border border-border bg-background p-6 text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-accent-soft">
              <span className="text-xl">⚠️</span>
            </div>
            <h3 className="mt-4 text-lg font-semibold">{modalError.error}</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              "{STEPS[modalError.step - 1].label}" 단계에서 입력을 마친 뒤 다시 시도해주세요.
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
            className={`flex flex-1 min-w-[150px] items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors hover:border-foreground/40 ${
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
                {s.kicker}
              </div>
              <div className="text-sm font-medium">{s.label}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
