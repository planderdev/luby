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
