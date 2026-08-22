"use server";

import { trackedCreate, AI_MODEL_FAST, stopReasonError } from "@/lib/ai/client";
import { buildSystemBlocks, fetchCatalog } from "@/lib/ai/system";
import { createClient } from "@/lib/supabase/server";

// ---------- Helpers ---------------------------------------------------------

type AIResult<T> = { ok: true; data: T } | { ok: false; error: string };

async function ensureAuth(): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  return { ok: true, userId: user.id };
}

/**
 * Run a Claude call with prompt-caching system + JSON-schema output.
 *
 * 모든 실패 지점(API 키 누락, 카탈로그 로드, 네트워크, 파싱)을 try 안에서
 * 처리해 {ok:false}로 반환 — 액션이 throw하면 Next.js가 에러 페이지로
 * 보내버리므로 절대 밖으로 던지지 않는다.
 */
async function callAI<T>(opts: {
  userPrompt: string;
  schema: Record<string, unknown>;
  maxTokens?: number;
  /** true = adaptive thinking + effort medium (전체 초안 등 무거운 작업 전용) */
  deep?: boolean;
  /** ai_usage 기록용 */
  feature: string;
  userId: string;
}): Promise<AIResult<T>> {
  try {
    const catalog = await fetchCatalog();
    const response = await trackedCreate({
      model: AI_MODEL_FAST,
      // max_tokens는 thinking + 응답 JSON의 "합산" 상한 — 낮으면 JSON이 중간에 잘려
      // "Unterminated string in JSON" 파싱 오류가 난다. 5세대 토크나이저는 한국어를
      // ~30% 더 세므로 이전(8192)보다 넉넉히.
      max_tokens: opts.maxTokens ?? 12000,
      // Sonnet 5: adaptive thinking이 기본. 짧은 카피는 effort low로 빠르게,
      // 전체 초안은 medium. effort 기본값(high)은 함수 타임아웃(504) 위험이라 항상 명시.
      thinking: { type: "adaptive" },
      system: buildSystemBlocks(catalog),
      output_config: {
        effort: opts.deep ? "medium" : "low",
        format: {
          type: "json_schema",
          schema: opts.schema,
        },
      },
      messages: [{ role: "user", content: opts.userPrompt }],
    }, { feature: opts.feature, userId: opts.userId });

    const stopErr = stopReasonError(response.stop_reason);
    if (stopErr) return { ok: false, error: stopErr };

    // Extract first text block — output_config.format constrains it to valid JSON
    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return { ok: false, error: "AI가 응답을 생성하지 못했습니다." };
    }
    const parsed = JSON.parse(textBlock.text) as T;
    return { ok: true, data: parsed };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `AI 호출 실패: ${msg}` };
  }
}

// ---------- Step 1: Title suggestions ---------------------------------------

export type TitleSuggestion = { titles: string[] };

export async function suggestTitles(input: {
  industryBrief: string;
  businessName: string;
}): Promise<AIResult<TitleSuggestion>> {
  const auth = await ensureAuth();
  if (!auth.ok) return auth;

  if (!input.industryBrief?.trim() || !input.businessName?.trim()) {
    return { ok: false, error: "업종 설명과 상호명이 필요합니다." };
  }

  return callAI<TitleSuggestion>({ feature: "campaign_copy_title", userId: auth.userId,    userPrompt: `다음 정보로 인플루언서가 클릭하고 싶어할 만한 캠페인 제목 3개를 만들어주세요.

상호명: ${input.businessName}
업종 설명: ${input.industryBrief}

각 제목은:
- 25~40자 사이
- 구체적인 제품/서비스나 혜택을 암시
- 같은 톤이 반복되지 않게 다양하게 (예: 1번은 매력 어필 / 2번은 혜택 강조 / 3번은 호기심 유발)`,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        // NOTE: Anthropic 구조화 출력은 minItems/maxItems/minimum/maximum을
        // 지원하지 않음(400). 개수·범위는 프롬프트로 지시하고 서버에서 클램핑.
        titles: {
          type: "array",
          items: { type: "string" },
        },
      },
      required: ["titles"],
    },
  });
}


/**
 * 모델이 카탈로그에 없는 ID를 돌려주는 경우(드묾) 방어 — 유효한 ID만 남기고,
 * 선택 채널마다 미션이 1개는 있도록 정리한다. 카테고리·홍보유형이 무효면 빈 문자열(UI가 선택 유도).
 */
async function sanitizeChannelPicks<T extends {
  channel_type_ids: string[];
  missions: { channel_type_id: string; description: string }[];
  category_id?: string;
  promotion_type_id?: string;
}>(d: T): Promise<T> {
  const catalog = await fetchCatalog();
  const validCh = new Set(catalog.channels.map((c) => c.id));
  const validCat = new Set(catalog.categories.map((c) => c.id));
  const validPromo = new Set(catalog.promotionTypes.map((p) => p.id));
  const channel_type_ids = [...new Set(d.channel_type_ids.filter((id) => validCh.has(id)))].slice(0, 4);
  const missions = d.missions.filter((m) => channel_type_ids.includes(m.channel_type_id) && m.description?.trim());
  // 미션이 빠진 채널은 제외 (미션 없는 채널을 광고주가 다시 채워야 하는 상황 방지)
  const withMission = channel_type_ids.filter((id) => missions.some((m) => m.channel_type_id === id));
  return {
    ...d,
    channel_type_ids: withMission,
    missions: missions.filter((m) => withMission.includes(m.channel_type_id)),
    ...(d.category_id !== undefined ? { category_id: validCat.has(d.category_id) ? d.category_id : "" } : {}),
    ...(d.promotion_type_id !== undefined ? { promotion_type_id: validPromo.has(d.promotion_type_id) ? d.promotion_type_id : "" } : {}),
  };
}

// ---------- Step 2: Promotion + category + channels + missions --------------

export type PromotionSuggestion = {
  promotion_type_id: string;
  category_id: string;
  channel_type_ids: string[];
  missions: { channel_type_id: string; description: string }[];
};

export async function suggestPromotionAndChannels(input: {
  industryBrief: string;
  businessName: string;
}): Promise<AIResult<PromotionSuggestion>> {
  const auth = await ensureAuth();
  if (!auth.ok) return auth;
  if (!input.industryBrief?.trim()) return { ok: false, error: "업종 설명이 필요합니다." };

  const r = await callAI<PromotionSuggestion>({ feature: "campaign_copy_channels", userId: auth.userId,    userPrompt: `상호명: ${input.businessName}
업종 설명: ${input.industryBrief}

위 정보를 보고:
1. 가장 어울리는 promotion_type_id 1개 선택
2. 가장 어울리는 category_id 1개 선택
3. 이 업종에 가장 효과적인 channel_type_ids 2~3개 선택 (예: 인스타+블로그)
4. 선택한 각 채널마다 인플루언서가 수행할 미션 1개씩 작성 (60~150자, 채널 특성 반영)

미션 작성 시 주의:
- 시스템의 "채널별 콘텐츠 형식 가이드"를 그대로 따를 것 (인스타→릴스/피드, 블로그→상세후기, 샤오홍슈→중국어 笔记 등)
- 중국·화교권 관광객이 찾을 만한 방문형 매장이나 K뷰티·K푸드라면 xiaohongshu 를 채널 후보에 포함
- 해시태그·키워드·언급해야 할 핵심 포인트를 구체적으로
- 너무 많은 요구사항은 금지 (1~3개의 명확한 액션만)`,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        promotion_type_id: { type: "string" },
        category_id: { type: "string" },
        channel_type_ids: {
          type: "array",
          items: { type: "string" },
        },
        missions: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              channel_type_id: { type: "string" },
              description: { type: "string" },
            },
            required: ["channel_type_id", "description"],
          },
        },
      },
      required: ["promotion_type_id", "category_id", "channel_type_ids", "missions"],
    },
  });
  if (!r.ok) return r;
  return { ok: true, data: await sanitizeChannelPicks(r.data) };
}

// ---------- Step 4: Keywords + recruit count -------------------------------

export type RecruitSuggestion = {
  recruit_count: number;
  keywords: string[];
};

export async function suggestRecruitAndKeywords(input: {
  industryBrief: string;
  businessName: string;
}): Promise<AIResult<RecruitSuggestion>> {
  const auth = await ensureAuth();
  if (!auth.ok) return auth;
  if (!input.industryBrief?.trim()) return { ok: false, error: "업종 설명이 필요합니다." };

  return callAI<RecruitSuggestion>({ feature: "campaign_copy_recruit", userId: auth.userId,    userPrompt: `상호명: ${input.businessName}
업종 설명: ${input.industryBrief}

위 정보를 보고:
1. 이 업종/캠페인 규모에 적정한 모집 인원 (recruit_count) 추천 (보통 5~30명, 고가 제품일수록 적게)
2. 콘텐츠 발행 시 포함될 키워드/해시태그 5~8개 (공백 없는 단어, # 없이)
   - 업종/제품의 본질을 나타내는 단어
   - 검색에 잡히는 트렌디한 단어 1~2개
   - 지역명이 포함되면 좋을 경우 지역 키워드 1개`,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        recruit_count: { type: "integer" },
        keywords: {
          type: "array",
          items: { type: "string" },
        },
      },
      required: ["recruit_count", "keywords"],
    },
  });
}

// ---------- Step 5: Offerings + points -------------------------------------

export type OfferingSuggestion = {
  offerings: { title: string; description: string; estimated_value: number }[];
  point_amount: number;
};

export async function suggestOfferingsAndPoints(input: {
  industryBrief: string;
  businessName: string;
}): Promise<AIResult<OfferingSuggestion>> {
  const auth = await ensureAuth();
  if (!auth.ok) return auth;
  if (!input.industryBrief?.trim()) return { ok: false, error: "업종 설명이 필요합니다." };

  return callAI<OfferingSuggestion>({ feature: "campaign_copy_offerings", userId: auth.userId,    userPrompt: `상호명: ${input.businessName}
업종 설명: ${input.industryBrief}

위 정보를 보고:
1. 인플루언서에게 제공할 항목(offerings) 1~3개 추천 (제품/서비스/식사권 등)
   - 각 항목: title (간결), description (선택, 활용법·특징), estimated_value (KRW)
2. 활동 포인트 추천 (point_amount, KRW) — 업종 평균 + 제공물 가치 고려, 보통 10,000~100,000원

값은 한국 마켓의 일반 시세를 반영합니다.`,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        offerings: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              estimated_value: { type: "integer" },
            },
            required: ["title", "description", "estimated_value"],
          },
        },
        point_amount: { type: "integer" },
      },
      required: ["offerings", "point_amount"],
    },
  });
}

// ---------- Super action: AI에게 전부 맡기기 ---------------------------------

export type FullDraftSuggestion = {
  title: string;
  promotion_type_id: string;
  category_id: string;
  channel_type_ids: string[];
  missions: { channel_type_id: string; description: string }[];
  recruit_count: number;
  keywords: string[];
  offerings: { title: string; description: string; estimated_value: number }[];
  point_amount: number;
};

export async function suggestEverything(input: {
  industryBrief: string;
  businessName: string;
}): Promise<AIResult<FullDraftSuggestion>> {
  const auth = await ensureAuth();
  if (!auth.ok) return auth;
  if (!input.industryBrief?.trim() || !input.businessName?.trim()) {
    return { ok: false, error: "업종 설명과 상호명이 필요합니다." };
  }

  const r = await callAI<FullDraftSuggestion>({ feature: "campaign_draft", userId: auth.userId,
    maxTokens: 16000,
    deep: true,
    userPrompt: `상호명: ${input.businessName}
업종 설명: ${input.industryBrief}

위 정보만으로 캠페인을 처음부터 끝까지 자동으로 채워주세요.

작성 항목:
- title: 매력적인 캠페인 제목 (25~40자)
- promotion_type_id: 가장 어울리는 홍보 유형
- category_id: 가장 어울리는 카테고리
- channel_type_ids: 가장 효과적인 채널 2~3개 (중국·화교권 관광객이 찾는 방문형 매장·K뷰티·K푸드라면 xiaohongshu 포함 검토)
- missions: 선택한 채널별 미션 (각 60~150자, 시스템의 채널별 콘텐츠 형식 가이드 준수 — 글로벌 채널은 사용 언어·현지어 키워드 병기)
- recruit_count: 적정 모집 인원
- keywords: 5~8개 핵심 키워드
- offerings: 제공 내역 1~3개 (각 title + description + estimated_value KRW)
- point_amount: 활동 포인트 (KRW)

광고주가 손대지 않아도 바로 발행 가능할 정도로 디테일을 채워주세요.`,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string" },
        promotion_type_id: { type: "string" },
        category_id: { type: "string" },
        channel_type_ids: {
          type: "array",
          items: { type: "string" },
        },
        missions: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              channel_type_id: { type: "string" },
              description: { type: "string" },
            },
            required: ["channel_type_id", "description"],
          },
        },
        recruit_count: { type: "integer" },
        keywords: {
          type: "array",
          items: { type: "string" },
        },
        offerings: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              estimated_value: { type: "integer" },
            },
            required: ["title", "description", "estimated_value"],
          },
        },
        point_amount: { type: "integer" },
      },
      required: [
        "title",
        "promotion_type_id",
        "category_id",
        "channel_type_ids",
        "missions",
        "recruit_count",
        "keywords",
        "offerings",
        "point_amount",
      ],
    },
  });
  if (!r.ok) return r;

  // 스키마 제약 미지원 대체: 개수·범위 서버측 클램핑 + 카탈로그 ID 검증
  const d = await sanitizeChannelPicks(r.data);
  return {
    ok: true,
    data: {
      ...d,
      recruit_count: Math.min(100, Math.max(1, d.recruit_count)),
      keywords: d.keywords.slice(0, 8),
      offerings: d.offerings
        .slice(0, 4)
        .map((o) => ({ ...o, estimated_value: Math.max(0, o.estimated_value) })),
      point_amount: Math.max(0, d.point_amount),
    },
  };
}
