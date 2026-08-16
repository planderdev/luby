import { getAnthropic, AI_MODEL_REASONING, stopReasonError } from "./client";

/**
 * AI 콘텐츠 사전 검수 — 제출된 콘텐츠(URL + 메모)를 캠페인 미션과 대조해
 * 광고주의 수동 검수를 준비해준다.
 *
 * 원칙: URL 패턴과 메모 텍스트만으로 "확인 가능한 것"과 "직접 확인해야 하는 것"을
 * 구분한다. 콘텐츠 본문은 열어볼 수 없으므로 절대 내용을 지어내지 않는다 — 확인
 * 불가 항목은 unknown으로 두고 광고주가 볼 체크포인트로 넘긴다.
 */

export type ContentReviewInput = {
  campaignTitle: string;
  businessName: string;
  industryBrief: string | null;
  promotionType: string | null;
  missions: { channel: string; description: string; required: boolean }[];
  keywords: string[];
  contentUrl: string;
  note: string | null;
};

export type ContentReview = {
  verdict: "approve_recommended" | "needs_check";
  channel_guess: string | null;
  channel_match: "match" | "mismatch" | "unknown";
  checklist: { item: string; status: "pass" | "fail" | "unknown"; note: string }[];
  summary: string;
  advertiser_actions: string[];
};

type Result = { ok: true; review: ContentReview } | { ok: false; error: string };

// 구조화 출력 스키마 — minItems/maxItems/minLength 등은 400 에러가 나므로 금지.
// 개수 제한은 프롬프트로 지시하고 아래에서 서버측 클램핑.
const REVIEW_SCHEMA = {
  type: "object",
  properties: {
    verdict: { type: "string", enum: ["approve_recommended", "needs_check"] },
    channel_guess: { type: ["string", "null"] },
    channel_match: { type: "string", enum: ["match", "mismatch", "unknown"] },
    checklist: {
      type: "array",
      items: {
        type: "object",
        properties: {
          item: { type: "string" },
          status: { type: "string", enum: ["pass", "fail", "unknown"] },
          note: { type: "string" },
        },
        required: ["item", "status", "note"],
        additionalProperties: false,
      },
    },
    summary: { type: "string" },
    advertiser_actions: { type: "array", items: { type: "string" } },
  },
  required: [
    "verdict",
    "channel_guess",
    "channel_match",
    "checklist",
    "summary",
    "advertiser_actions",
  ],
  additionalProperties: false,
} as const;

export async function reviewSubmissionContent(input: ContentReviewInput): Promise<Result> {
  try {
    const client = getAnthropic();

    const missionLines = input.missions.length
      ? input.missions
          .map(
            (m) => `- [${m.channel}]${m.required ? " (필수)" : ""} ${m.description}`
          )
          .join("\n")
      : "- (등록된 채널별 미션 없음)";

    const userPrompt = `당신은 루비AI의 콘텐츠 검수 어시스턴트입니다. 체험단 크리에이터가 제출한 콘텐츠를 캠페인 미션과 대조해 광고주의 검수를 준비해주세요.

## 캠페인
- 제목: ${input.campaignTitle}
- 업체: ${input.businessName}
- 업종 설명: ${input.industryBrief ?? "(없음)"}
- 홍보 유형: ${input.promotionType ?? "(없음)"}
- 채널별 미션:
${missionLines}
- 필수 키워드/해시태그: ${input.keywords.length ? input.keywords.join(", ") : "(없음)"}

## 제출물
- 콘텐츠 URL: ${input.contentUrl}
- 크리에이터 메모: ${input.note?.trim() || "(없음)"}

## 규칙
1. 당신은 URL을 열어볼 수 없습니다. URL 도메인/경로 패턴과 메모 텍스트만으로 판단하세요.
2. URL 패턴으로 채널을 추정하세요 (instagram.com→Instagram, tiktok.com→TikTok, youtube.com/youtu.be→YouTube, blog.naver.com→네이버 블로그 등). 미션 채널과 일치하는지 channel_match로 표시.
3. checklist는 미션·키워드 기반 4~7개 항목. 확인 가능한 것만 pass/fail, 열어봐야 아는 것은 반드시 unknown + 광고주가 볼 포인트를 note에.
4. 메모에 해시태그가 적혀 있으면 필수 키워드 포함 여부를 pass/fail로 판단 가능. 메모에 없다고 해서 콘텐츠에 없다고 단정하지 말 것 (unknown).
5. verdict: fail이 하나라도 있거나 채널 불일치면 needs_check. 전부 pass/unknown이고 채널 일치면 approve_recommended (단, unknown 항목은 advertiser_actions로 안내).
6. advertiser_actions는 광고주가 콘텐츠를 열어 직접 확인할 일 2~4개, 한 문장씩.
7. summary는 2문장 이내 한국어.`;

    const response = await client.messages.create({
      // 검수는 "확인 가능한 것만 판정" 같은 절제된 판단이 핵심 → Opus 5.
      // adaptive + low: 5세대에서 disabled 대신 권장되는 저비용 설정.
      model: AI_MODEL_REASONING,
      max_tokens: 4000,
      thinking: { type: "adaptive" },
      output_config: {
        effort: "low",
        format: { type: "json_schema", schema: REVIEW_SCHEMA as Record<string, unknown> },
      },
      messages: [{ role: "user", content: userPrompt }],
    });

    const stopErr = stopReasonError(response.stop_reason);
    if (stopErr) return { ok: false, error: stopErr };
    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return { ok: false, error: "AI가 응답을 생성하지 못했습니다." };
    }

    const parsed = JSON.parse(textBlock.text) as ContentReview;
    // 서버측 클램핑 (스키마로 개수 제한 불가)
    parsed.checklist = (parsed.checklist ?? []).slice(0, 8);
    parsed.advertiser_actions = (parsed.advertiser_actions ?? []).slice(0, 4);
    return { ok: true, review: parsed };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `AI 검수 실패: ${msg}` };
  }
}
