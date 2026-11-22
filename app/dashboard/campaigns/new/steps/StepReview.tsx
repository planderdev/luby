"use client";

import { useEffect, useState, useTransition } from "react";
import { Check, Pencil, RefreshCw, Sparkles, Wand2, X } from "lucide-react";
import { aiErrorMessage } from "@/lib/ai/ai-errors";
import type { CampaignDraft } from "../actions";
import type { Category, Channel, PromotionType } from "../CampaignBuilder";
import { Field, TextInput, NumberInput, Select, TextArea } from "./_shared";
import { AIButton } from "../AIButton";
import { BenchmarkHint } from "../BenchmarkHint";
import { suggestTitles } from "../ai-actions";

const STAGES = [
  "답해주신 내용을 정리하고 있어요",
  "캠페인 제목을 고르고 있어요",
  "어울리는 채널을 정하고 있어요",
  "채널별로 해야 할 일을 쓰고 있어요",
  "인원과 포인트를 제안하고 있어요",
  "마무리 중이에요 — 거의 다 됐어요",
];

const fmtDate = (v: string | null) => (v ? v.replace("T", " ").slice(0, 16) : "");

/** 확인 — AI 가 만든 가이드를 크리에이터에게 보이는 순서대로 보여주고, 틀린 곳만 고치게 한다 */
export function StepReview({
  draft,
  categories,
  channels,
  promotionTypes,
  update,
  generating,
  aiError,
  changes,
  stale,
  canRefresh,
  onGenerate,
  onEdit,
}: {
  draft: CampaignDraft;
  categories: Category[];
  channels: Channel[];
  promotionTypes: PromotionType[];
  update: <K extends keyof CampaignDraft>(key: K, value: CampaignDraft[K]) => void;
  generating: boolean;
  aiError: string | null;
  /** 지난 성과를 반영해 바꾼 점 (복제 리프레시) */
  changes: string[];
  /** 가이드를 만든 뒤 질문 답을 바꿨다 */
  stale: boolean;
  /** 복제 원본이 있어 '지난 성과 반영' 을 쓸 수 있다 */
  canRefresh: boolean;
  onGenerate: (withHistory?: boolean) => void;
  onEdit: (step: number) => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  const [titleOptions, setTitleOptions] = useState<string[]>([]);
  const [titlePending, startTitle] = useTransition();
  const [titleError, setTitleError] = useState<string | null>(null);
  const [keywordInput, setKeywordInput] = useState("");

  useEffect(() => {
    if (!generating) {
      setElapsed(0);
      return;
    }
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [generating]);

  const hasGuide = draft.channel_type_ids.length > 0 || draft.title.trim().length > 0;
  const promotion = promotionTypes.find((p) => p.id === draft.promotion_type_id);
  const offerings = draft.offerings.filter((o) => o.title.trim());
  const offerTotal = offerings.reduce((sum, o) => sum + (o.estimated_value ?? 0), 0);

  if (generating) {
    const stage = STAGES[Math.min(Math.floor(elapsed / 5), STAGES.length - 1)];
    return (
      <div role="status" aria-live="polite" className="py-10 text-center">
        <div className="relative mx-auto flex size-14 items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-accent/20" />
          <span className="absolute inset-0 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
          <Sparkles className="relative size-6 text-accent-ink" />
        </div>
        <h2 className="mt-6 text-xl font-semibold">AI가 가이드를 만들고 있어요</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {stage} · {elapsed}초 경과 (보통 15~30초)
        </p>
        <div className="mx-auto mt-5 h-1.5 w-full max-w-sm overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-accent transition-all duration-1000" style={{ width: `${Math.min(92, 8 + elapsed * 3)}%` }} />
        </div>
        <p className="mt-4 text-xs text-muted-foreground">이 화면을 벗어나지 말아주세요.</p>
      </div>
    );
  }

  if (!hasGuide) {
    return (
      <div className="py-10 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-3xl bg-accent-soft">
          <Wand2 className="size-6 text-accent-ink" />
        </div>
        <h2 className="mt-6 text-xl font-semibold">아직 가이드가 없어요</h2>
        <p className="mt-2 text-sm text-muted-foreground">답해주신 내용으로 제목·채널·해야 할 일·인원·포인트를 한 번에 만듭니다.</p>
        {aiError && (
          <div className="mx-auto mt-5 max-w-md rounded-2xl border border-accent/30 bg-accent-soft px-4 py-3 text-sm text-accent-ink">{aiError}</div>
        )}
        <button
          type="button"
          onClick={() => onGenerate(false)}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background"
        >
          <Wand2 className="size-4" />
          AI 가이드 만들기
        </button>
      </div>
    );
  }

  function generateTitles() {
    setTitleError(null);
    setTitleOptions([]);
    startTitle(async () => {
      try {
        const r = await suggestTitles({ industryBrief: draft.industry_brief, businessName: draft.business_name });
        if (r.ok) setTitleOptions(r.data.titles);
        else setTitleError(r.error);
      } catch (e) {
        setTitleError(aiErrorMessage(e, "AI 호출 중 오류가 발생했습니다."));
      }
    });
  }
  function toggleChannel(id: string) {
    const has = draft.channel_type_ids.includes(id);
    update("channel_type_ids", has ? draft.channel_type_ids.filter((c) => c !== id) : [...draft.channel_type_ids, id]);
    if (has) update("missions", draft.missions.filter((m) => m.channel_type_id !== id));
  }
  function setMission(channelId: string, description: string) {
    update("missions", [...draft.missions.filter((m) => m.channel_type_id !== channelId), { channel_type_id: channelId, description }]);
  }
  function addKeyword() {
    const k = keywordInput.trim().replace(/^#/, "");
    if (!k || draft.keywords.includes(k)) return;
    update("keywords", [...draft.keywords, k]);
    setKeywordInput("");
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold lg:text-2xl">가이드를 확인해주세요</h2>
          <p className="mt-2 text-sm text-muted-foreground">크리에이터에게 보이는 순서 그대로입니다. 틀린 곳만 고치면 돼요.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canRefresh && (
            <button
              type="button"
              onClick={() => onGenerate(true)}
              title="복제 원본 캠페인의 응모·선정·승인·도달 결과를 반영해 채널·미션·포인트·인원을 조정합니다"
              className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent-soft px-3 py-1.5 text-xs font-medium text-accent-ink hover:bg-accent-soft/80"
            >
              <Wand2 className="size-3.5" />
              지난 성과 반영해 다시 만들기
            </button>
          )}
          <button
            type="button"
            onClick={() => onGenerate(false)}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted"
          >
            <RefreshCw className="size-3.5" />
            가이드 다시 만들기
          </button>
        </div>
      </div>

      {aiError && <div className="rounded-2xl border border-accent/30 bg-accent-soft px-4 py-3 text-sm text-accent-ink">{aiError}</div>}
      {stale && (
        <div className="rounded-2xl border border-border bg-muted/60 px-4 py-3 text-sm">
          가이드를 만든 뒤 답변을 바꾸셨어요. 바뀐 내용을 반영하려면 <strong className="font-semibold">가이드 다시 만들기</strong>를 눌러주세요.
        </div>
      )}
      {changes.length > 0 && (
        <div className="rounded-2xl border border-accent/30 bg-background p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-accent-ink">지난 성과를 반영해 바꾼 점</div>
          <ul className="mt-2 space-y-1 text-sm">
            {changes.map((c, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-accent" />
                {c}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 제목 */}
      <Field label="캠페인 제목" hint="크리에이터가 가장 먼저 보는 한 줄">
        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="flex-1">
              <TextInput value={draft.title} onChange={(v) => update("title", v)} placeholder="예: 봄 신상 라이트 세럼 체험단 모집" required />
            </div>
            <AIButton onClick={generateTitles} pending={titlePending} label="다른 제목" />
          </div>
          {titleError && <p className="text-xs text-accent-ink">{titleError}</p>}
          {titleOptions.length > 0 && (
            <div className="space-y-1.5 rounded-2xl border border-border bg-muted/40 p-3">
              {titleOptions.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => update("title", t)}
                  className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-sm ${
                    draft.title === t ? "border-foreground bg-background" : "border-border bg-background hover:bg-muted"
                  }`}
                >
                  <span>{t}</span>
                  {draft.title === t && <Check className="size-4 shrink-0 text-accent" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </Field>

      {/* 제공 내역 — 질문 2에서 답한 그대로 */}
      <Block title="제공 내역" onEdit={() => onEdit(2)}>
        {offerings.length === 0 ? (
          <p className="text-sm text-muted-foreground">제공 내역이 아직 없어요.</p>
        ) : (
          <ul className="space-y-1.5">
            {offerings.map((o, i) => (
              <li key={i} className="flex items-start justify-between gap-4 text-sm">
                <span>
                  <span className="font-medium">{o.title}</span>
                  {o.description && <span className="ml-2 text-xs text-muted-foreground">{o.description}</span>}
                </span>
                {o.estimated_value ? <span className="shrink-0 tabular-nums">{o.estimated_value.toLocaleString()}원</span> : null}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          {promotion?.name ?? "체험 방식 미정"}
          {draft.recruit_start && draft.recruit_end ? ` · 모집 ${fmtDate(draft.recruit_start)} ~ ${fmtDate(draft.recruit_end)}` : " · 모집 기간 미정"}
          {draft.experience_start || draft.experience_end ? ` · 체험 ${fmtDate(draft.experience_start)} ~ ${fmtDate(draft.experience_end)}` : ""}
        </p>
      </Block>

      {/* 해야 할 일 */}
      <div>
        <div className="text-sm font-medium">해야 할 일</div>
        <p className="mt-0.5 text-xs text-muted-foreground">콘텐츠를 올릴 채널과, 채널마다 크리에이터가 할 일입니다.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {channels.map((c) => {
            const active = draft.channel_type_ids.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={active}
                onClick={() => toggleChannel(c.id)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm transition-colors ${
                  active ? "border-foreground bg-foreground text-background" : "border-border bg-background hover:bg-muted"
                }`}
              >
                {active && <Check className="size-3.5" />}
                {c.name}
              </button>
            );
          })}
        </div>
        <div className="mt-3 space-y-3">
          {draft.channel_type_ids.map((id) => {
            const ch = channels.find((c) => c.id === id);
            if (!ch) return null;
            return (
              <div key={id} className="rounded-2xl border border-border bg-background p-4">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{ch.name}</div>
                <TextArea
                  value={draft.missions.find((m) => m.channel_type_id === id)?.description ?? ""}
                  onChange={(v) => setMission(id, v)}
                  placeholder={`${ch.name}에서 할 일 — 형식·분량, 꼭 담을 내용, 주의할 점`}
                  rows={4}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* 꼭 담을 것 / 피할 것 — 질문 3에서 답한 그대로 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Block title="꼭 담을 것" onEdit={() => onEdit(3)}>
          <BulletList items={draft.guide.must_include} empty="정한 내용이 없어요." />
        </Block>
        <Block title="피해야 할 것" onEdit={() => onEdit(3)}>
          <BulletList items={draft.guide.avoid} empty="정한 내용이 없어요." />
        </Block>
      </div>

      {/* 키워드 */}
      <div>
        <div className="text-sm font-medium">키워드·해시태그</div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {draft.keywords.map((k) => (
            <span key={k} className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs">
              #{k}
              <button
                type="button"
                onClick={() => update("keywords", draft.keywords.filter((x) => x !== k))}
                aria-label={`${k} 삭제`}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
          <input
            type="text"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                e.preventDefault();
                addKeyword();
              }
            }}
            onBlur={addKeyword}
            placeholder="+ 키워드 추가"
            aria-label="키워드 추가"
            className="w-36 rounded-full border border-dashed border-border bg-background px-3 py-1.5 text-xs outline-none focus:border-foreground"
          />
        </div>
      </div>

      {/* 사장님이 확정할 것 — 비용 */}
      <div className="rounded-3xl border border-border bg-background p-5 lg:p-6">
        <div className="text-sm font-semibold">직접 확정해주세요</div>
        <p className="mt-0.5 text-xs text-muted-foreground">비용에 해당하는 항목이라 AI 제안값을 그대로 쓰지 않고 한 번 확인받습니다.</p>
        <div className="mt-4 grid gap-5 md:grid-cols-2">
          <Field label="모집 인원" hint="선정할 크리에이터 수">
            <NumberInput value={draft.recruit_count} onChange={(v) => update("recruit_count", Math.max(1, v))} min={1} max={1000} />
            <BenchmarkHint categoryId={draft.category_id || null} mode="recruit" value={draft.recruit_count} />
          </Field>
          <Field label="포인트" hint="1인당 지급 (원)">
            <NumberInput value={draft.point_amount} onChange={(v) => update("point_amount", Math.max(0, v))} min={0} step={1000} />
            <BenchmarkHint categoryId={draft.category_id || null} mode="points" value={draft.point_amount} />
          </Field>
        </div>
        <p className="mt-4 border-t border-border pt-3 text-sm">
          예상 포인트 합계{" "}
          <strong className="font-semibold tabular-nums">{(draft.point_amount * draft.recruit_count).toLocaleString()}원</strong>
          <span className="text-muted-foreground">
            {" "}
            ({draft.point_amount.toLocaleString()}원 × {draft.recruit_count}명)
            {offerTotal > 0 ? ` · 제공 내역 ${(offerTotal * draft.recruit_count).toLocaleString()}원 상당 별도` : ""}
          </span>
        </p>
      </div>

      {/* 분류·연락처 — AI 가 고른 값, 대부분 손댈 일 없음 */}
      <details className="rounded-2xl border border-border bg-background">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium">
          분류·연락처{" "}
          <span className="font-normal text-muted-foreground">
            — {categories.find((c) => c.id === draft.category_id)?.name ?? "카테고리 미정"}
          </span>
        </summary>
        <div className="grid gap-5 border-t border-border p-4 md:grid-cols-2">
          <Field label="카테고리">
            <Select
              value={draft.category_id}
              onChange={(v) => update("category_id", v)}
              options={categories.map((c) => ({ value: c.id, label: `${c.emoji ?? ""} ${c.name}`.trim() }))}
              placeholder="선택해주세요"
            />
          </Field>
          <Field label="담당자 연락처" hint="선택">
            <TextInput value={draft.contact_phone} onChange={(v) => update("contact_phone", v)} placeholder="010-0000-0000" type="tel" />
          </Field>
        </div>
      </details>

      <p className="rounded-2xl bg-muted/60 px-4 py-3 text-xs text-muted-foreground">
        검수 요청 후 운영팀이 내용을 확인하면 모집이 시작됩니다. 보통 24시간 안에 결과를 알려드려요.
      </p>
    </div>
  );
}

function Block({ title, onEdit, children }: { title: string; onEdit: () => void; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</span>
        <button type="button" onClick={onEdit} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <Pencil className="size-3" />
          수정
        </button>
      </div>
      {children}
    </div>
  );
}

function BulletList({ items, empty }: { items: string[]; empty: string }) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <ul className="space-y-1 text-sm">
      {items.map((x) => (
        <li key={x} className="flex gap-2">
          <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-foreground/40" />
          {x}
        </li>
      ))}
    </ul>
  );
}
