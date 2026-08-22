"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { CampaignDraft } from "../actions";
import { StepHeader, Field, TextInput, NumberInput, TextArea } from "./_shared";
import { AIButton } from "../AIButton";
import { BenchmarkHint } from "../BenchmarkHint";
import { suggestOfferingsAndPoints } from "../ai-actions";

export function Step5Offering({
  draft,
  update,
  applyPatch,
}: {
  draft: CampaignDraft;
  update: <K extends keyof CampaignDraft>(key: K, value: CampaignDraft[K]) => void;
  applyPatch?: (patch: Partial<CampaignDraft>) => void;
}) {
  const [aiPending, startAI] = useTransition();
  const [aiError, setAIError] = useState<string | null>(null);

  function runAI() {
    setAIError(null);
    startAI(async () => {
      let r: Awaited<ReturnType<typeof suggestOfferingsAndPoints>>;
      try {
        r = await suggestOfferingsAndPoints({
          industryBrief: draft.industry_brief,
          businessName: draft.business_name,
          categoryId: draft.category_id || null,
        });
      } catch (e) {
        setAIError(e instanceof Error ? e.message : "AI 호출 중 오류가 발생했습니다.");
        return;
      }
      if (!r.ok) {
        setAIError(r.error);
        return;
      }
      applyPatch?.({
        offerings: r.data.offerings.map((o) => ({
          title: o.title,
          description: o.description,
          estimated_value: o.estimated_value,
        })),
        point_amount: r.data.point_amount,
      });
    });
  }
  const aiReady = draft.industry_brief.trim().length >= 10;
  function addOffering() {
    update("offerings", [
      ...draft.offerings,
      { title: "", description: "", estimated_value: null },
    ]);
  }
  function removeOffering(idx: number) {
    update(
      "offerings",
      draft.offerings.filter((_, i) => i !== idx)
    );
  }
  function patchOffering(idx: number, patch: Partial<CampaignDraft["offerings"][number]>) {
    update(
      "offerings",
      draft.offerings.map((o, i) => (i === idx ? { ...o, ...patch } : o))
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <StepHeader
          title="제공 내역 · 포인트"
          desc="인플루언서에게 제공하는 제품·서비스와 포인트를 입력합니다."
        />
        <AIButton
          onClick={runAI}
          pending={aiPending}
          disabled={!aiReady}
          label="AI 제공내역·포인트 추천"
        />
      </div>
      {aiError && (
        <div className="rounded-2xl border border-accent/30 bg-accent-soft px-4 py-3 text-sm text-accent-ink">
          ⚠ {aiError}
        </div>
      )}

      <Field label="제공 내역" hint="제공하는 항목별로 추가 (제품, 서비스, 식사권 등)">
        <div className="space-y-3">
          {draft.offerings.map((o, i) => (
            <div key={i} className="rounded-2xl border border-border bg-muted/40 p-4">
              <div className="grid gap-3 md:grid-cols-[2fr_1fr]">
                <TextInput
                  value={o.title}
                  onChange={(v) => patchOffering(i, { title: v })}
                  placeholder="제공 항목 (예: 봄 세럼 50ml × 1)"
                />
                <NumberInput
                  value={o.estimated_value ?? 0}
                  onChange={(v) => patchOffering(i, { estimated_value: v || null })}
                  min={0}
                />
              </div>
              <div className="mt-2">
                <TextArea
                  value={o.description}
                  onChange={(v) => patchOffering(i, { description: v })}
                  placeholder="설명 (선택) — 추가 안내, 사용법 등"
                  rows={2}
                />
              </div>
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => removeOffering(i)}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Trash2 className="size-3.5" />
                  제거
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={addOffering}
            className="inline-flex items-center gap-2 rounded-full border border-dashed border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Plus className="size-4" />
            제공 내역 추가
          </button>
        </div>
      </Field>

      <Field label="포인트" hint="선정된 인플루언서에게 지급할 활동 포인트">
        <div className="flex items-center gap-3">
          <NumberInput
            value={draft.point_amount}
            onChange={(v) => update("point_amount", Math.max(0, v))}
            min={0}
            step={1000}
          />
          <span className="shrink-0 text-sm text-muted-foreground">원/포인트</span>
        </div>
        <BenchmarkHint categoryId={draft.category_id || null} mode="points" value={draft.point_amount} />
      </Field>

      <div className="rounded-2xl border border-accent/30 bg-accent-soft px-5 py-4 text-sm text-accent-ink">
        검수 요청 후 운영팀이 캠페인 내용을 확인하면 모집중 상태로 변경됩니다. 평균 24시간 이내
        결과를 알려드립니다.
      </div>
    </div>
  );
}
