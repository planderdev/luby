"use client";

import { useState, useTransition } from "react";
import { aiErrorMessage } from "@/lib/ai/ai-errors";
import type { CampaignDraft } from "../actions";
import type { Category, Channel, PromotionType } from "../CampaignBuilder";
import { StepHeader, Field, Select, TextArea } from "./_shared";
import { AIButton } from "../AIButton";
import { suggestPromotionAndChannels } from "../ai-actions";

export function Step2Promotion({
  draft,
  categories,
  channels,
  promotionTypes,
  update,
  applyPatch,
}: {
  draft: CampaignDraft;
  categories: Category[];
  channels: Channel[];
  promotionTypes: PromotionType[];
  update: <K extends keyof CampaignDraft>(key: K, value: CampaignDraft[K]) => void;
  applyPatch?: (patch: Partial<CampaignDraft>) => void;
}) {
  const [aiPending, startAI] = useTransition();
  const [aiError, setAIError] = useState<string | null>(null);

  function runAI() {
    setAIError(null);
    startAI(async () => {
      let r: Awaited<ReturnType<typeof suggestPromotionAndChannels>>;
      try {
        r = await suggestPromotionAndChannels({
          industryBrief: draft.industry_brief,
          businessName: draft.business_name,
        });
      } catch (e) {
        setAIError(aiErrorMessage(e, "AI 호출 중 오류가 발생했습니다."));
        return;
      }
      if (!r.ok) {
        setAIError(r.error);
        return;
      }
      const validMissions = r.data.missions.filter((m) =>
        r.data.channel_type_ids.includes(m.channel_type_id)
      );
      applyPatch?.({
        promotion_type_id: r.data.promotion_type_id,
        category_id: r.data.category_id,
        channel_type_ids: r.data.channel_type_ids,
        missions: validMissions,
      });
    });
  }
  const aiReady = draft.industry_brief.trim().length >= 10;
  function toggleChannel(id: string) {
    const has = draft.channel_type_ids.includes(id);
    const next = has
      ? draft.channel_type_ids.filter((c) => c !== id)
      : [...draft.channel_type_ids, id];
    update("channel_type_ids", next);

    // Clean up missions for removed channels
    if (has) {
      update(
        "missions",
        draft.missions.filter((m) => m.channel_type_id !== id)
      );
    }
  }

  function setMission(channelId: string, description: string) {
    const others = draft.missions.filter((m) => m.channel_type_id !== channelId);
    update("missions", [...others, { channel_type_id: channelId, description }]);
  }

  function getMission(channelId: string) {
    return draft.missions.find((m) => m.channel_type_id === channelId)?.description ?? "";
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <StepHeader
          title="홍보 유형 · 채널"
          desc="어떤 방식으로 홍보할지, 어떤 채널에 콘텐츠를 발행할지 선택합니다."
        />
        <AIButton
          onClick={runAI}
          pending={aiPending}
          disabled={!aiReady}
          label="AI가 전부 추천"
        />
      </div>
      {aiError && (
        <div className="rounded-2xl border border-accent/30 bg-accent-soft px-4 py-3 text-sm text-accent-ink">
          ⚠ {aiError}
        </div>
      )}
      {!aiReady && (
        <p className="text-xs text-muted-foreground">
          💡 Step 1에서 업종 설명을 입력하면 AI 추천을 사용할 수 있습니다.
        </p>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <Field label="홍보 유형">
          <Select
            value={draft.promotion_type_id}
            onChange={(v) => update("promotion_type_id", v)}
            options={promotionTypes.map((p) => ({ value: p.id, label: p.name }))}
            placeholder="선택해주세요"
          />
        </Field>

        <Field label="카테고리">
          <Select
            value={draft.category_id}
            onChange={(v) => update("category_id", v)}
            options={categories.map((c) => ({
              value: c.id,
              label: `${c.emoji ?? ""} ${c.name}`.trim(),
            }))}
            placeholder="선택해주세요"
          />
        </Field>
      </div>

      <Field label="발행 채널" hint="복수 선택 가능">
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          {channels.map((c) => {
            const active = draft.channel_type_ids.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggleChannel(c.id)}
                className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition-colors ${
                  active
                    ? "border-foreground bg-muted/60"
                    : "border-border bg-background hover:bg-muted/40"
                }`}
              >
                <span className="text-sm font-medium">{c.name}</span>
                <span
                  className={`size-4 rounded-full border ${
                    active ? "border-foreground bg-foreground" : "border-border"
                  }`}
                />
              </button>
            );
          })}
        </div>
      </Field>

      {draft.channel_type_ids.length > 0 && (
        <Field label="채널별 미션" hint="각 채널에서 인플루언서가 수행할 미션">
          <div className="space-y-3">
            {draft.channel_type_ids.map((id) => {
              const ch = channels.find((c) => c.id === id);
              if (!ch) return null;
              return (
                <div key={id} className="rounded-2xl border border-border bg-muted/40 p-4">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {ch.name}
                  </div>
                  <TextArea
                    value={getMission(id)}
                    onChange={(v) => setMission(id, v)}
                    placeholder={`${ch.name}에서 수행할 미션을 입력해주세요. 예) 제품 사용 후기 1건 발행, 해시태그 3개 포함`}
                  />
                </div>
              );
            })}
          </div>
        </Field>
      )}
    </div>
  );
}
