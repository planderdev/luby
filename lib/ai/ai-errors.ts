/**
 * AI 호출 오류 → 한국어 안내 문구.
 *
 * Anthropic SDK 오류는 영문(`429 rate_limit_error…`, `Connection error.` 등)이라 그대로 보여주면 안 된다.
 * 우리가 던지는 한국어 오류(AiQuotaExceededError, stopReasonError 결과)는 그대로 통과시킨다.
 */

const FALLBACK = "AI 호출에 실패했어요. 잠시 후 다시 시도해 주세요.";
const hasKorean = (s: string) => /[가-힣]/.test(s);

const RULES: { test: RegExp; ko: string }[] = [
  { test: /rate.?limit|429/i, ko: "AI 요청이 몰리고 있어요. 30초쯤 뒤에 다시 시도해 주세요." },
  { test: /overloaded|529|503/i, ko: "AI 서버가 혼잡해요. 잠시 후 다시 시도해 주세요." },
  { test: /timed? ?out|timeout|deadline/i, ko: "AI 응답이 지연되고 있어요. 잠시 후 다시 시도해 주세요." },
  { test: /connection error|network|fetch failed|ECONNRESET|socket hang up/i, ko: "네트워크 연결이 불안정해요. 잠시 후 다시 시도해 주세요." },
  { test: /authentication|invalid x-api-key|401|permission|403/i, ko: "AI 설정에 문제가 있어요. 잠시 후 다시 시도하거나 운영팀에 문의해 주세요." },
  { test: /credit balance|billing|quota/i, ko: "AI 사용 한도에 걸렸어요. 잠시 후 다시 시도하거나 운영팀에 문의해 주세요." },
  { test: /too long|max.?tokens|context.?length|prompt is too long/i, ko: "입력이 너무 길어요. 내용을 줄여서 다시 시도해 주세요." },
  { test: /invalid.?request|400|schema|validation/i, ko: "요청 형식이 올바르지 않아요. 입력을 조금 바꿔 다시 시도해 주세요." },
  { test: /JSON|Unexpected token|not valid json/i, ko: "AI 응답을 이해하지 못했어요. 다시 시도해 주세요." },
  { test: /abort|cancel/i, ko: "요청이 중단됐어요. 다시 시도해 주세요." },
];

export function aiErrorMessage(err: unknown, fallback = FALLBACK): string {
  if (!err) return fallback;
  // 월 한도 초과 등 우리가 만든 한국어 오류는 그대로
  if (err instanceof Error && err.name === "AiQuotaExceededError") return err.message;
  const raw = (err instanceof Error ? err.message : typeof err === "string" ? err : String(err)).trim();
  if (raw && hasKorean(raw)) return raw;
  for (const rule of RULES) if (rule.test.test(raw)) return rule.ko;
  return fallback;
}
