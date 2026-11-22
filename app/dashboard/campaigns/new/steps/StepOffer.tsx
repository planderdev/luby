"use client";

import { Plus, Trash2 } from "lucide-react";
import type { CampaignDraft } from "../actions";
import type { PromotionType } from "../CampaignBuilder";
import { StepHeader, Field, TextInput, NumberInput, Checkbox } from "./_shared";

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

/** datetime-local 값(YYYY-MM-DDTHH:mm) — 사용자의 현지 시각 그대로 */
function localValue(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

const RECRUIT_PRESETS = [
  { label: "오늘부터 1주", days: 7 },
  { label: "오늘부터 2주", days: 14 },
  { label: "오늘부터 한 달", days: 30 },
];

/** 질문 2 — 무엇을 드리고, 어떻게 체험하나요? */
export function StepOffer({
  draft,
  promotionTypes,
  update,
}: {
  draft: CampaignDraft;
  promotionTypes: PromotionType[];
  update: <K extends keyof CampaignDraft>(key: K, value: CampaignDraft[K]) => void;
}) {
  const offerings = draft.offerings.length > 0 ? draft.offerings : [{ title: "", description: "", estimated_value: null }];

  function patchOffering(idx: number, patch: Partial<CampaignDraft["offerings"][number]>) {
    update("offerings", offerings.map((o, i) => (i === idx ? { ...o, ...patch } : o)));
  }
  function setRecruitPreset(days: number) {
    const start = new Date();
    start.setSeconds(0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + days);
    end.setHours(23, 59, 0, 0);
    update("recruit_start", localValue(start));
    update("recruit_end", localValue(end));
  }
  function patchSchedule(idx: number, patch: Partial<CampaignDraft["schedules"][number]>) {
    update("schedules", draft.schedules.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  }

  const hasScheduleDetail =
    !!draft.experience_start || !!draft.experience_end || draft.same_day_reservation || draft.always_open || draft.schedules.length > 0;

  return (
    <div className="space-y-7">
      <StepHeader
        title="무엇을 드리고, 어떻게 체험하나요?"
        desc="크리에이터와의 약속이 되는 내용이라 AI가 대신 정하지 않습니다. 실제로 제공하는 그대로 적어주세요."
      />

      {/* 버튼 묶음은 <label> 로 감싸지 않는다 — 빈 곳을 눌러도 첫 버튼이 눌리기 때문 */}
      <div role="group" aria-label="체험 방식">
        <span className="mb-1.5 block text-xs font-medium text-muted-foreground">체험 방식</span>
        <div className="grid gap-2 md:grid-cols-2">
          {promotionTypes.map((p) => {
            const active = draft.promotion_type_id === p.id;
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={active}
                onClick={() => update("promotion_type_id", p.id)}
                className={`flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition-colors ${
                  active ? "border-foreground bg-muted/60" : "border-border bg-background hover:bg-muted/40"
                }`}
              >
                <span>
                  <span className="block text-sm font-medium">{p.name}</span>
                  {p.description && <span className="mt-0.5 block text-xs text-muted-foreground">{p.description}</span>}
                </span>
                <span className={`mt-0.5 size-4 shrink-0 rounded-full border ${active ? "border-foreground bg-foreground" : "border-border"}`} />
              </button>
            );
          })}
        </div>
      </div>

      <div role="group" aria-label="제공 내역">
        <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
          제공 내역<span className="ml-2 text-muted-foreground/70">— 무엇을 얼마어치 드리나요?</span>
        </span>
        <div className="space-y-3">
          {offerings.map((o, i) => (
            <div key={i} className="rounded-2xl border border-border bg-background p-4">
              <div className="grid gap-3 md:grid-cols-[2fr_1fr]">
                <TextInput
                  value={o.title}
                  onChange={(v) => patchOffering(i, { title: v })}
                  placeholder="예: 2인 디너 코스 / 세럼 50ml 1개"
                  ariaLabel="제공 항목"
                />
                <div className="flex items-center gap-2">
                  <NumberInput
                    value={o.estimated_value ?? 0}
                    onChange={(v) => patchOffering(i, { estimated_value: v || null })}
                    min={0}
                    step={1000}
                    ariaLabel="금액 (원 상당)"
                  />
                  <span className="shrink-0 text-xs text-muted-foreground">원 상당</span>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1">
                  <TextInput
                    value={o.description}
                    onChange={(v) => patchOffering(i, { description: v })}
                    placeholder="추가 안내 (선택) — 예: 주류 제외, 동반 1인 가능"
                    ariaLabel="제공 항목 추가 안내"
                  />
                </div>
                {offerings.length > 1 && (
                  <button
                    type="button"
                    onClick={() => update("offerings", offerings.filter((_, x) => x !== i))}
                    aria-label="제공 내역 삭제"
                    className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground"
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => update("offerings", [...offerings, { title: "", description: "", estimated_value: null }])}
            className="inline-flex items-center gap-2 rounded-full border border-dashed border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Plus className="size-4" />
            제공 내역 추가
          </button>
        </div>
      </div>

      <div>
        <span className="mb-1.5 block text-xs font-medium text-muted-foreground">모집 기간</span>
        <div className="mb-3 flex flex-wrap gap-2">
          {RECRUIT_PRESETS.map((p) => (
            <button
              key={p.days}
              type="button"
              onClick={() => setRecruitPreset(p.days)}
              className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted"
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="모집 시작">
            <TextInput type="datetime-local" value={draft.recruit_start} onChange={(v) => update("recruit_start", v)} required />
          </Field>
          <Field label="모집 종료">
            <TextInput type="datetime-local" value={draft.recruit_end} onChange={(v) => update("recruit_end", v)} required />
          </Field>
        </div>
      </div>

      <details className="rounded-2xl border border-border bg-background" open={hasScheduleDetail}>
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium">
          체험 기간·가능 요일 정하기 <span className="font-normal text-muted-foreground">— 선택</span>
        </summary>
        <div className="space-y-5 border-t border-border p-4">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="체험 시작">
              <TextInput type="datetime-local" value={draft.experience_start ?? ""} onChange={(v) => update("experience_start", v || null)} />
            </Field>
            <Field label="체험 종료">
              <TextInput type="datetime-local" value={draft.experience_end ?? ""} onChange={(v) => update("experience_end", v || null)} />
            </Field>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Checkbox
              checked={draft.same_day_reservation}
              onChange={(v) => update("same_day_reservation", v)}
              label="당일 예약 가능"
              desc="크리에이터가 당일 방문·체험을 예약할 수 있습니다."
            />
            <Checkbox
              checked={draft.always_open}
              onChange={(v) => update("always_open", v)}
              label="요일·시간 제한 없음"
              desc="언제든 체험할 수 있습니다."
            />
          </div>
          {!draft.always_open && (
            <div className="space-y-2">
              <span className="block text-xs font-medium text-muted-foreground">가능 요일·시간</span>
              {draft.schedules.map((s, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-background p-3">
                  <select
                    value={s.day_of_week}
                    onChange={(e) => patchSchedule(i, { day_of_week: Number(e.target.value) })}
                    aria-label="요일"
                    className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  >
                    {DAY_LABELS.map((d, idx) => (
                      <option key={idx} value={idx}>
                        {d}요일
                      </option>
                    ))}
                  </select>
                  <input
                    type="time"
                    value={s.start_time}
                    onChange={(e) => patchSchedule(i, { start_time: e.target.value })}
                    aria-label="시작 시간"
                    className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  />
                  <span className="text-xs text-muted-foreground">~</span>
                  <input
                    type="time"
                    value={s.end_time}
                    onChange={(e) => patchSchedule(i, { end_time: e.target.value })}
                    aria-label="종료 시간"
                    className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => update("schedules", draft.schedules.filter((_, x) => x !== i))}
                    className="ml-auto inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <Trash2 className="size-3.5" />
                    삭제
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => update("schedules", [...draft.schedules, { day_of_week: 1, start_time: "10:00", end_time: "21:00" }])}
                className="inline-flex items-center gap-2 rounded-full border border-dashed border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Plus className="size-4" />
                요일·시간 추가
              </button>
            </div>
          )}
        </div>
      </details>
    </div>
  );
}
