import Anthropic from "@anthropic-ai/sdk";

let _client: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not configured.");
  }
  if (!_client) {
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _client;
}

/**
 * 용도별 모델 (2026-08-16 사용자 승인으로 Sonnet 4.6 → 5세대 전환)
 *
 * - AI_MODEL_FAST: 캠페인 빌더 카피 생성(제목·미션·혜택·전체 초안). 속도가 UX라 Sonnet.
 * - AI_MODEL_REASONING: 인플루언서 매칭·콘텐츠 사전 검수. 판단 품질이 핵심이라 Opus.
 *
 * 5세대 공통 주의: thinking을 생략하면 adaptive가 기본. `disabled`는 Opus 5에서
 * tool call을 텍스트로 뱉는 등 알려진 부작용이 있어 쓰지 않는다 — 비용/속도는
 * effort(low/medium)로 조절. 토크나이저가 한국어를 ~30% 더 세므로 max_tokens 여유 필요.
 */
export const AI_MODEL_FAST = "claude-sonnet-5" as const;
export const AI_MODEL_REASONING = "claude-opus-5" as const;

/** @deprecated 용도별 상수를 사용할 것. 하위 호환용 별칭. */
export const AI_MODEL = AI_MODEL_FAST;

/** 안전 분류기 거절 등 비정상 종료를 사용자 문구로 변환. null이면 정상. */
export function stopReasonError(stopReason: string | null): string | null {
  if (stopReason === "max_tokens") {
    return "AI 응답이 길이 제한에 걸렸습니다. 다시 시도해주세요.";
  }
  if (stopReason === "refusal") {
    return "AI가 이 요청을 처리할 수 없다고 판단했습니다. 입력 내용을 조금 바꿔 다시 시도해주세요.";
  }
  return null;
}

/* ============================================================
   사용량 추적 — 모든 AI 호출은 trackedCreate 를 통해 ai_usage 에 기록된다.
   (service_role 로 insert, 실패해도 본 호출에는 영향 없음)
   ============================================================ */
import type { MessageCreateParamsNonStreaming, Message } from "@anthropic-ai/sdk/resources/messages";

export type AiContext = {
  /** 기능 식별자: campaign_copy | campaign_draft | creator_match | applicant_fit | content_review | campaign_precheck | apply_message | report_summary */
  feature: string;
  userId?: string | null;
  campaignId?: string | null;
};

/** USD / 1M tokens — Anthropic 1st-party 요율 (2026-08). Sonnet 5 는 8/31 까지 인트로 요율. */
const PRICE: Record<string, { input: number; output: number; introUntil?: string; introInput?: number; introOutput?: number }> = {
  "claude-opus-5": { input: 5, output: 25 },
  "claude-sonnet-5": { input: 3, output: 15, introUntil: "2026-08-31", introInput: 2, introOutput: 10 },
  "claude-haiku-4-5": { input: 1, output: 5 },
};

export function estimateCostUsd(model: string, u: { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number | null; cache_creation_input_tokens?: number | null }): number {
  const p = PRICE[model];
  if (!p) return 0;
  const intro = p.introUntil && new Date().toISOString().slice(0, 10) <= p.introUntil;
  const inPrice = intro ? p.introInput! : p.input;
  const outPrice = intro ? p.introOutput! : p.output;
  const cacheRead = u.cache_read_input_tokens ?? 0;
  const cacheWrite = u.cache_creation_input_tokens ?? 0;
  const usd =
    (u.input_tokens * inPrice + cacheRead * inPrice * 0.1 + cacheWrite * inPrice * 1.25 + u.output_tokens * outPrice) / 1_000_000;
  return Math.round(usd * 1_000_000) / 1_000_000;
}

async function logUsage(row: {
  feature: string; model: string; user_id: string | null; campaign_id: string | null;
  input_tokens: number; output_tokens: number; cache_read_tokens: number; cache_write_tokens: number;
  duration_ms: number; ok: boolean; error: string | null; cost_usd: number;
}) {
  try {
    const { getAdminSupabase } = await import("@/lib/supabase/admin");
    await getAdminSupabase().from("ai_usage").insert(row);
  } catch (e) {
    console.error("[ai_usage] log failed", e instanceof Error ? e.message : e);
  }
}

/**
 * client.messages.create 와 동일하지만 소요 시간·토큰·추정 비용을 ai_usage 에 남긴다.
 * 예외는 그대로 던지므로 호출부의 try/catch 패턴은 변경 불필요.
 */
export async function trackedCreate(params: MessageCreateParamsNonStreaming, ctx: AiContext): Promise<Message> {
  const t0 = Date.now();
  try {
    const r = await getAnthropic().messages.create(params);
    void logUsage({
      feature: ctx.feature,
      model: params.model,
      user_id: ctx.userId ?? null,
      campaign_id: ctx.campaignId ?? null,
      input_tokens: r.usage.input_tokens,
      output_tokens: r.usage.output_tokens,
      cache_read_tokens: r.usage.cache_read_input_tokens ?? 0,
      cache_write_tokens: r.usage.cache_creation_input_tokens ?? 0,
      duration_ms: Date.now() - t0,
      ok: r.stop_reason !== "refusal" && r.stop_reason !== "max_tokens",
      error: r.stop_reason === "refusal" ? "refusal" : r.stop_reason === "max_tokens" ? "max_tokens" : null,
      cost_usd: estimateCostUsd(params.model, r.usage),
    });
    return r;
  } catch (e) {
    void logUsage({
      feature: ctx.feature, model: params.model, user_id: ctx.userId ?? null, campaign_id: ctx.campaignId ?? null,
      input_tokens: 0, output_tokens: 0, cache_read_tokens: 0, cache_write_tokens: 0,
      duration_ms: Date.now() - t0, ok: false, error: (e instanceof Error ? e.message : String(e)).slice(0, 500), cost_usd: 0,
    });
    throw e;
  }
}
