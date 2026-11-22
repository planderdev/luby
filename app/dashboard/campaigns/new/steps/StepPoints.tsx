"use client";

import { useState } from "react";
import { Check, Plus, X } from "lucide-react";
import type { CampaignDraft } from "../actions";
import type { PromotionType } from "../CampaignBuilder";
import { StepHeader } from "./_shared";

const MAX_ITEMS = 8;

/** 체험 방식(promotion_types.slug)별 '꼭 담을 것' 예시 — 눌러서 고르는 칩 */
const MUST_EXAMPLES: Record<string, string[]> = {
  visit: ["대표 메뉴·시그니처", "매장 외관과 간판", "매장 분위기·인테리어", "메뉴판·가격", "위치·찾아오는 길", "예약 방법"],
  delivery: ["제품 전체 모습과 패키지", "실제 사용하는 장면", "사용 전후 비교", "제형·질감 클로즈업", "용량·가격", "구매처"],
  service: ["주문·구매하는 과정", "받은 제품·서비스 화면", "실제 이용하는 장면", "가격·구성", "구매 링크"],
  event: ["행사 현장 분위기", "주요 프로그램·부스", "일정·장소", "참여 방법"],
};
const MUST_FALLBACK = ["대표 상품·서비스", "실제 이용 장면", "가격", "위치·구매처", "브랜드 이름"];

const AVOID_EXAMPLES = [
  "다른 손님·직원 얼굴 노출",
  "경쟁 브랜드 언급·비교",
  "효능·효과 과장 표현",
  "할인·가격 행사 언급",
  "촬영 금지 구역 촬영",
  "광고·협찬 표기 누락",
];

/** 질문 3 — 꼭 담겼으면 하는 것과 피해야 할 것 */
export function StepPoints({
  draft,
  promotionTypes,
  update,
}: {
  draft: CampaignDraft;
  promotionTypes: PromotionType[];
  update: <K extends keyof CampaignDraft>(key: K, value: CampaignDraft[K]) => void;
}) {
  const slug = promotionTypes.find((p) => p.id === draft.promotion_type_id)?.slug ?? "";
  const mustExamples = MUST_EXAMPLES[slug] ?? MUST_FALLBACK;

  return (
    <div className="space-y-8">
      <StepHeader
        title="꼭 담겼으면 하는 것과 피해야 할 것"
        desc="예시를 누르거나 직접 적어주세요. 각각 1~3개면 충분합니다. 이 내용이 가이드의 중심이 됩니다."
      />

      <PickList
        label="꼭 담겼으면 하는 것"
        hint="콘텐츠에 반드시 보였으면 하는 장면이나 정보"
        examples={mustExamples}
        value={draft.guide.must_include}
        onChange={(v) => update("guide", { ...draft.guide, must_include: v })}
        placeholder="직접 입력 — 예: 창가 자리에서 보이는 한강 뷰"
      />

      <PickList
        label="피해야 할 것"
        hint="촬영·표현에서 조심해야 하는 것 (없으면 비워두세요)"
        examples={AVOID_EXAMPLES}
        value={draft.guide.avoid}
        onChange={(v) => update("guide", { ...draft.guide, avoid: v })}
        placeholder="직접 입력 — 예: 주방 내부 촬영"
      />
    </div>
  );
}

function PickList({
  label,
  hint,
  examples,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  hint: string;
  examples: string[];
  value: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
}) {
  const [input, setInput] = useState("");
  const full = value.length >= MAX_ITEMS;
  const custom = value.filter((v) => !examples.includes(v));

  function toggle(item: string) {
    if (value.includes(item)) onChange(value.filter((v) => v !== item));
    else if (!full) onChange([...value, item]);
  }
  function add() {
    const v = input.trim().slice(0, 120);
    if (!v || value.includes(v) || full) return;
    onChange([...value, v]);
    setInput("");
  }

  return (
    <div>
      <div className="text-sm font-medium">{label}</div>
      <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        {examples.map((e) => {
          const active = value.includes(e);
          return (
            <button
              key={e}
              type="button"
              aria-pressed={active}
              onClick={() => toggle(e)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm transition-colors ${
                active ? "border-foreground bg-foreground text-background" : "border-border bg-background hover:bg-muted"
              }`}
            >
              {active && <Check className="size-3.5" />}
              {e}
            </button>
          );
        })}
        {custom.map((c) => (
          <span key={c} className="inline-flex items-center gap-1.5 rounded-full border border-foreground bg-foreground px-3.5 py-2 text-sm text-background">
            {c}
            <button type="button" onClick={() => toggle(c)} aria-label={`${c} 삭제`} className="opacity-70 hover:opacity-100">
              <X className="size-3.5" />
            </button>
          </span>
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          aria-label={`${label} 직접 입력`}
          disabled={full}
          className="flex-1 rounded-2xl glass-card px-4 py-3 text-sm outline-none focus:border-foreground disabled:opacity-50"
        />
        <button
          type="button"
          onClick={add}
          disabled={full || !input.trim()}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
        >
          <Plus className="size-4" />
          추가
        </button>
      </div>
    </div>
  );
}
