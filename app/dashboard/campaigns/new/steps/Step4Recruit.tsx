"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import type { CampaignDraft } from "../actions";
import { StepHeader, Field, NumberInput } from "./_shared";
import { AIButton } from "../AIButton";
import { suggestRecruitAndKeywords } from "../ai-actions";

export function Step4Recruit({
  draft,
  update,
  applyPatch,
}: {
  draft: CampaignDraft;
  update: <K extends keyof CampaignDraft>(key: K, value: CampaignDraft[K]) => void;
  applyPatch?: (patch: Partial<CampaignDraft>) => void;
}) {
  const [keywordInput, setKeywordInput] = useState("");
  const [aiPending, startAI] = useTransition();
  const [aiError, setAIError] = useState<string | null>(null);

  function runAI() {
    setAIError(null);
    startAI(async () => {
      let r: Awaited<ReturnType<typeof suggestRecruitAndKeywords>>;
      try {
        r = await suggestRecruitAndKeywords({
          industryBrief: draft.industry_brief,
          businessName: draft.business_name,
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
        recruit_count: r.data.recruit_count,
        keywords: r.data.keywords,
      });
    });
  }
  const aiReady = draft.industry_brief.trim().length >= 10;

  function addKeyword() {
    const k = keywordInput.trim();
    if (!k) return;
    if (draft.keywords.includes(k)) {
      setKeywordInput("");
      return;
    }
    update("keywords", [...draft.keywords, k]);
    setKeywordInput("");
  }

  function removeKeyword(k: string) {
    update(
      "keywords",
      draft.keywords.filter((x) => x !== k)
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <StepHeader
          title="체험단 설정"
          desc="모집 인원과 콘텐츠 발행 시 강조할 키워드를 정합니다."
        />
        <AIButton
          onClick={runAI}
          pending={aiPending}
          disabled={!aiReady}
          label="AI 인원·키워드 추천"
        />
      </div>
      {aiError && (
        <div className="rounded-2xl border border-accent/30 bg-accent-soft px-4 py-3 text-sm text-accent-ink">
          ⚠ {aiError}
        </div>
      )}

      <Field label="모집 인원" hint="선정할 인플루언서 수">
        <NumberInput
          value={draft.recruit_count}
          onChange={(v) => update("recruit_count", Math.max(1, v))}
          min={1}
          max={1000}
        />
      </Field>

      <Field label="키워드 / 해시태그" hint="콘텐츠에 포함될 핵심 키워드 (Enter로 추가)">
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addKeyword();
                }
              }}
              placeholder="예: 봄세럼, 라이트케어, 강남맛집"
              className="flex-1 rounded-2xl glass-card px-4 py-3 text-sm outline-none focus:border-foreground"
            />
            <button
              type="button"
              onClick={addKeyword}
              className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background"
            >
              추가
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {draft.keywords.length === 0 && (
              <span className="text-xs text-muted-foreground">아직 등록된 키워드가 없습니다.</span>
            )}
            {draft.keywords.map((k) => (
              <span
                key={k}
                className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs"
              >
                #{k}
                <button
                  type="button"
                  onClick={() => removeKeyword(k)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      </Field>
    </div>
  );
}
