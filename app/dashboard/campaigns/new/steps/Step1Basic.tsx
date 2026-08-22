"use client";

import { useEffect, useState, useTransition } from "react";
import { Wand2, Loader2, Check, Sparkles } from "lucide-react";
import type { CampaignDraft } from "../actions";
import type { Region } from "../CampaignBuilder";
import { StepHeader, Field, TextInput, Select, TextArea } from "./_shared";
import { ImageUpload } from "@/components/ImageUpload";
import { AIButton } from "../AIButton";
import { suggestTitles, suggestEverything } from "../ai-actions";

export function Step1Basic({
  draft,
  regions,
  update,
  applySuper,
  fromId = null,
}: {
  draft: CampaignDraft;
  regions: Region[];
  update: <K extends keyof CampaignDraft>(key: K, value: CampaignDraft[K]) => void;
  /** Called when "AI에게 전부 맡기기" returns; lets parent jump to Step 5 */
  applySuper?: (patch: Partial<CampaignDraft>) => void;
  /** 복제 원본 캠페인 id — 지난 성과 반영 리프레시 버튼 노출 */
  fromId?: string | null;
}) {
  const [titleOptions, setTitleOptions] = useState<string[]>([]);
  const [titlePending, startTitle] = useTransition();
  const [superPending, startSuper] = useTransition();
  const [refreshMode, setRefreshMode] = useState(false);
  const [changes, setChanges] = useState<string[]>([]);
  const [aiError, setAiError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const aiReady = draft.industry_brief.trim().length >= 10 && draft.business_name.trim().length > 0;

  // AI 전체 작성 중 경과 시간(초) — 보통 15~30초 걸리므로 진행감을 준다
  useEffect(() => {
    if (!superPending) {
      setElapsed(0);
      return;
    }
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [superPending]);

  const SUPER_STAGES = [
    "업종을 분석하고 있어요",
    "캠페인 제목을 고르고 있어요",
    "홍보 유형과 채널을 정하고 있어요",
    "채널별 미션을 작성하고 있어요",
    "혜택과 키워드를 정리하고 있어요",
    "마무리 중이에요 — 거의 다 됐어요",
  ];
  const stageIndex = Math.min(Math.floor(elapsed / 5), SUPER_STAGES.length - 1);

  function generateTitles() {
    setAiError(null);
    setTitleOptions([]);
    startTitle(async () => {
      try {
        const r = await suggestTitles({
          industryBrief: draft.industry_brief,
          businessName: draft.business_name,
        });
        if (r.ok) setTitleOptions(r.data.titles);
        else setAiError(r.error);
      } catch (e) {
        setAiError(e instanceof Error ? e.message : "AI 호출 중 오류가 발생했습니다.");
      }
    });
  }

  function runSuper(withHistory = false) {
    setAiError(null);
    setChanges([]);
    setRefreshMode(withHistory);
    startSuper(async () => {
      let r: Awaited<ReturnType<typeof suggestEverything>>;
      try {
        r = await suggestEverything({
          industryBrief: draft.industry_brief,
          businessName: draft.business_name,
          fromCampaignId: withHistory ? fromId : null,
        });
      } catch (e) {
        setAiError(e instanceof Error ? e.message : "AI 호출 중 오류가 발생했습니다.");
        return;
      }
      if (!r.ok) {
        setAiError(r.error);
        return;
      }
      const d = r.data;
      // Apply everything in one shot (parent will jump to Step 5)
      const missions = d.missions.filter((m) => d.channel_type_ids.includes(m.channel_type_id));
      const patch: Partial<CampaignDraft> = {
        title: d.title,
        promotion_type_id: d.promotion_type_id,
        category_id: d.category_id,
        channel_type_ids: d.channel_type_ids,
        missions,
        recruit_count: d.recruit_count,
        keywords: d.keywords,
        offerings: d.offerings.map((o) => ({
          title: o.title,
          description: o.description,
          estimated_value: o.estimated_value,
        })),
        point_amount: d.point_amount,
      };
      setChanges(d.changes ?? []);
      applySuper?.(patch);
    });
  }

  return (
    <div className="space-y-5">
      <StepHeader
        title="기본 정보"
        desc="업종을 한 줄로 설명해주시면, 나머지는 AI가 알아서 채워줍니다."
      />

      <div className="rounded-2xl border border-accent/30 bg-accent-soft/60 p-4">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-background">
            <Wand2 className="size-4 text-accent-ink" />
          </div>
          <div className="flex-1">
            <Field label="업종 / 제품 한 줄 설명" hint="모든 AI 추천의 컨텍스트가 됩니다">
              <TextArea
                value={draft.industry_brief}
                onChange={(v) => update("industry_brief", v)}
                placeholder="예: 강남 비건 카페, 신메뉴 비건 라떼 출시 / 30대 여성 타깃 안티에이징 세럼 신제품 / 부산 해운대 신상 일식 오마카세"
                rows={2}
              />
            </Field>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => runSuper(false)}
                disabled={!aiReady || superPending}
                className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition-transform hover:scale-[1.02] disabled:cursor-not-allowed ${
                  superPending
                    ? "bg-accent text-white opacity-100"
                    : "bg-foreground text-background disabled:opacity-50"
                }`}
              >
                {superPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Wand2 className="size-4" />
                )}
                {superPending ? `AI 작성 중… ${elapsed}초` : "✨ AI에게 전부 맡기기"}
              </button>
              {fromId && (
                <button
                  type="button"
                  onClick={() => runSuper(true)}
                  disabled={!aiReady || superPending}
                  className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent-soft px-5 py-2 text-sm font-medium text-accent-ink hover:bg-accent-soft/70 disabled:cursor-not-allowed disabled:opacity-50"
                  title="복제 원본 캠페인의 응모·선정·승인·도달 결과를 반영해 미션·채널·포인트·인원을 조정합니다"
                >
                  <Wand2 className="size-4" /> 지난 성과 반영해 다시 제안
                </button>
              )}
              {!superPending && (
                <span className="text-xs text-muted-foreground">
                  {aiReady
                    ? "Step 5까지 한 번에 완성됩니다 (약 15~30초)"
                    : "상호명과 업종 설명을 입력하면 사용 가능"}
                </span>
              )}
            </div>

            {!superPending && changes.length > 0 && (
              <div className="mt-4 rounded-2xl border border-accent/30 bg-background p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-accent-ink">{refreshMode ? "지난 성과를 반영해 바꾼 점" : "AI 메모"}</div>
                <ul className="mt-2 space-y-1 text-sm">
                  {changes.map((c, i) => (
                    <li key={i} className="flex gap-2"><span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-accent" />{c}</li>
                  ))}
                </ul>
              </div>
            )}

            {superPending && (
              <div
                role="status"
                aria-live="polite"
                className="mt-4 rounded-2xl border border-accent/40 bg-background p-5"
              >
                <div className="flex items-center gap-4">
                  <div className="relative flex size-12 shrink-0 items-center justify-center">
                    <span className="absolute inset-0 animate-ping rounded-full bg-accent/20" />
                    <span className="absolute inset-0 rounded-full border-2 border-accent/30 border-t-accent animate-spin" />
                    <Sparkles className="relative size-5 text-accent-ink" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">AI가 캠페인 전체를 작성하고 있어요</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {SUPER_STAGES[stageIndex]} · {elapsed}초 경과 (보통 15~30초)
                    </div>
                    <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-accent transition-all duration-1000"
                        style={{ width: `${Math.min(92, 8 + elapsed * 3)}%` }}
                      />
                    </div>
                  </div>
                </div>
                <p className="mt-3 text-[11px] text-muted-foreground">
                  완료되면 STEP 5로 자동 이동해요. 이 화면을 벗어나지 말아주세요.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Field label="상호명·브랜드명">
          <TextInput
            value={draft.business_name}
            onChange={(v) => update("business_name", v)}
            placeholder="예: 루비뷰티 강남점"
            required
          />
        </Field>

        <Field label="활동 지역">
          <Select
            value={draft.region_id}
            onChange={(v) => update("region_id", v)}
            options={regions.map((r) => ({ value: r.id, label: `${r.flag} ${r.name}` }))}
            placeholder="지역을 선택해주세요"
          />
        </Field>
      </div>

      <Field label="캠페인 제목" hint="인플루언서가 가장 먼저 보는 헤드라인">
        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="flex-1">
              <TextInput
                value={draft.title}
                onChange={(v) => update("title", v)}
                placeholder="예: 봄 신상 라이트 세럼 체험단 모집"
                required
              />
            </div>
            <AIButton
              onClick={generateTitles}
              pending={titlePending}
              disabled={!aiReady}
              label="제목 추천"
            />
          </div>
          {titleOptions.length > 0 && (
            <div className="rounded-2xl border border-border bg-muted/40 p-3">
              <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                AI 추천 제목 (클릭해서 적용)
              </div>
              <div className="space-y-1.5">
                {titleOptions.map((t) => {
                  const selected = draft.title === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => update("title", t)}
                      className={`group flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                        selected
                          ? "border-foreground bg-background"
                          : "border-border bg-background hover:bg-muted"
                      }`}
                    >
                      <span>{t}</span>
                      {selected && <Check className="size-4 shrink-0 text-accent" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </Field>

      <div className="grid gap-5 md:grid-cols-[1.5fr_1fr]">
        <Field label="캠페인 썸네일" hint="권장 16:9 비율 (1280x720), 최대 5MB">
          <ImageUpload
            bucket="campaign-thumbnails"
            value={draft.thumbnail_url}
            onChange={(url) => update("thumbnail_url", url)}
            shape="rect"
          />
        </Field>

        <Field label="담당자 연락처" hint="선택">
          <TextInput
            value={draft.contact_phone}
            onChange={(v) => update("contact_phone", v)}
            placeholder="010-0000-0000"
            type="tel"
          />
        </Field>
      </div>

      {aiError && (
        <div className="rounded-2xl border border-accent/30 bg-accent-soft px-4 py-3 text-sm text-accent-ink">
          ⚠ {aiError}
        </div>
      )}
    </div>
  );
}
