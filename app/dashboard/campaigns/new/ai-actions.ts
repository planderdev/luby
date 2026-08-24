"use server";

import { trackedCreate, AI_MODEL_FAST, stopReasonError } from "@/lib/ai/client";
import { aiErrorMessage } from "@/lib/ai/ai-errors";
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
    return { ok: false, error: aiErrorMessage(err) };
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
  categoryId?: string | null;
}): Promise<AIResult<RecruitSuggestion>> {
  const auth = await ensureAuth();
  if (!auth.ok) return auth;
  if (!input.industryBrief?.trim()) return { ok: false, error: "업종 설명이 필요합니다." };
  const bench = await benchmarkBlock(input.categoryId);

  return callAI<RecruitSuggestion>({ feature: "campaign_copy_recruit", userId: auth.userId,    userPrompt: `상호명: ${input.businessName}
업종 설명: ${input.industryBrief}${bench}

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

// ---------- 벤치마크 컨텍스트 (category_benchmark) --------------------------

/** 같은 분야(표본<3이면 전체) 최근 180일 집계를 프롬프트 블록으로. 실패/표본 없음이면 빈 문자열 */
async function benchmarkBlock(categoryId?: string | null): Promise<string> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.rpc("category_benchmark", { p_category: categoryId && /^[0-9a-f-]{36}$/.test(categoryId) ? categoryId : undefined });
    const b = data as null | { scope: "category" | "all"; sample: number; points_median: number | null; points_p25: number | null; points_p75: number | null; recruit_median: number | null; ratio_avg: number | null; fill_rate: number | null; approval_rate: number | null; top_channels: string[] };
    if (!b || !b.sample) return "";
    const n = (v: number | null) => (v === null ? "-" : Math.round(v).toLocaleString());
    return `

[플랫폼 벤치마크 — 최근 180일 ${b.scope === "category" ? "같은 분야" : "전체"} ${b.sample}개 캠페인]
포인트 중앙값 ${n(b.points_median)}P (보통 ${n(b.points_p25)}~${n(b.points_p75)}P) · 모집 인원 중앙값 ${n(b.recruit_median)}명 · 평균 경쟁률 ${b.ratio_avg ?? "-"}:1${b.fill_rate !== null ? ` · 모집 충원율 ${n(b.fill_rate)}%` : ""}${b.approval_rate !== null ? ` · 콘텐츠 승인율 ${n(b.approval_rate)}%` : ""}${b.top_channels.length ? ` · 많이 쓰는 채널 ${b.top_channels.join(", ")}` : ""}
규칙: point_amount 와 recruit_count 는 이 구간을 기준점으로 삼되, 제공물 가치·브리프의 규모·고가 여부에 따라 조정한다. 평균 경쟁률이 1:1 미만이면 포인트를 구간 상단 쪽으로 잡고 인원은 보수적으로, 충원율이 낮으면 인원을 줄인다. 벤치마크 수치를 그대로 복사하지 말고 근거로만 쓴다.`;
  } catch {
    return "";
  }
}

// ---------- Step 5: Offerings + points -------------------------------------

export type OfferingSuggestion = {
  offerings: { title: string; description: string; estimated_value: number }[];
  point_amount: number;
};

export async function suggestOfferingsAndPoints(input: {
  industryBrief: string;
  businessName: string;
  categoryId?: string | null;
}): Promise<AIResult<OfferingSuggestion>> {
  const auth = await ensureAuth();
  if (!auth.ok) return auth;
  if (!input.industryBrief?.trim()) return { ok: false, error: "업종 설명이 필요합니다." };
  const bench = await benchmarkBlock(input.categoryId);

  return callAI<OfferingSuggestion>({ feature: "campaign_copy_offerings", userId: auth.userId,    userPrompt: `상호명: ${input.businessName}
업종 설명: ${input.industryBrief}${bench}

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
  /** 지난 캠페인 성과를 반영해 바꾼 점 (복제 리프레시 시에만 채워짐) */
  changes: string[];
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
  /** 복제 원본 캠페인 id — 지난 성과를 반영해 조정한 초안을 만든다 */
  fromCampaignId?: string | null;
}): Promise<AIResult<FullDraftSuggestion>> {
  const auth = await ensureAuth();
  if (!auth.ok) return auth;
  if (!input.industryBrief?.trim() || !input.businessName?.trim()) {
    return { ok: false, error: "업종 설명과 상호명이 필요합니다." };
  }

  // 복제 리프레시: 원본 캠페인(본인 소유) 집계 + 미션·포인트를 컨텍스트로
  let history = "";
  if (input.fromCampaignId && /^[0-9a-f-]{36}$/.test(input.fromCampaignId)) {
    const supabase = await createClient();
    const { data: own } = await supabase.from("campaigns").select("id, title, point_amount, recruit_count, status").eq("id", input.fromCampaignId).maybeSingle();
    if (own && ["open", "closed", "completed"].includes(own.status)) {
      const { getAdminSupabase } = await import("@/lib/supabase/admin");
      const { data: rep } = await getAdminSupabase().rpc("build_campaign_report", { p_campaign_id: own.id });
      const r = rep as null | { metrics: { applied: number; selected: number; submitted: number; approved: number; total_reach: number; reach_by_channel: { channel: string; followers: number }[] }; channels: string[]; ai_summary: { summary?: string; next_steps?: string[] } | null };
      const { data: missions } = await supabase.from("campaign_missions").select("description").eq("campaign_id", own.id);
      if (r) {
        const m = r.metrics;
        const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);
        history = `

[지난 캠페인 성과 — 이 결과를 반영해 조정하세요]
제목: ${own.title} · 모집 ${own.recruit_count}명 · 포인트 ${own.point_amount.toLocaleString()}P · 채널: ${r.channels.join(", ") || "-"}
응모 ${m.applied}명(경쟁률 ${own.recruit_count > 0 ? (m.applied / own.recruit_count).toFixed(1) : "0"}:1) · 선정 ${m.selected} · 제출 ${m.submitted} · 승인 ${m.approved}(승인율 ${pct(m.approved, m.submitted)}%) · 예상 도달 ${m.total_reach.toLocaleString()} (${m.reach_by_channel.map((x) => `${x.channel} ${x.followers.toLocaleString()}`).join(", ") || "-"})
지난 미션: ${(missions ?? []).map((x) => x.description).join(" / ").slice(0, 600) || "-"}
${r.ai_summary?.summary ? `AI 리포트 요약: ${r.ai_summary.summary}` : ""}
${r.ai_summary?.next_steps?.length ? `제안됐던 다음 단계: ${r.ai_summary.next_steps.join(" / ")}` : ""}

조정 규칙: 경쟁률이 1:1 미만이면 포인트·제공 내역을 올리거나 채널을 넓히고 모집 인원은 줄인다. 경쟁률이 3:1 이상이면 인원을 늘리거나 포인트를 소폭 낮춘다. 승인율이 낮으면 미션을 더 구체적·간결하게 쓴다. 특정 채널 도달이 0이면 그 채널은 빼거나 대체한다. changes 에 바꾼 점과 근거를 2~4개, 각 한 문장(수치 인용)으로 적는다.`;
      }
    }
  }

  const bench = await benchmarkBlock(null);
  const r = await callAI<FullDraftSuggestion>({ feature: history ? "campaign_refresh" : "campaign_draft", userId: auth.userId,
    maxTokens: 16000,
    deep: true,
    userPrompt: `상호명: ${input.businessName}
업종 설명: ${input.industryBrief}${bench}${history}

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
- changes: 지난 캠페인 성과가 주어진 경우에만 바꾼 점과 근거(각 한 문장), 없으면 빈 배열

광고주가 손대지 않아도 바로 발행 가능할 정도로 디테일을 채워주세요.`,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        changes: { type: "array", items: { type: "string" } },
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
        "changes",
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
