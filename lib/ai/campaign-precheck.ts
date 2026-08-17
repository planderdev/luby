import { getAnthropic, AI_MODEL_REASONING, stopReasonError } from "./client";

/**
 * 운영자 검수 보조 — 캠페인 내용을 표시·광고 관점에서 사전 점검한다.
 * 판단은 "확인된 텍스트"만 근거로 하고, 법적 최종 판단이 아니라 검수자가 볼 체크포인트를 만든다.
 */
export type PrecheckInput = {
  title: string;
  businessName: string;
  industryBrief: string | null;
  category: string | null;
  promotionType: string | null;
  missions: { channel: string; description: string }[];
  keywords: string[];
  offerings: { title: string; description: string | null; estimatedValue: number | null }[];
  pointAmount: number;
  recruitCount: number;
  recruitDays: number;
};

export type Precheck = {
  verdict: "ok" | "caution" | "block";
  issues: { severity: "high" | "medium" | "low"; area: string; detail: string; fix: string }[];
  summary: string;
};

const SCHEMA = {
  type: "object",
  properties: {
    verdict: { type: "string", enum: ["ok", "caution", "block"] },
    issues: {
      type: "array",
      items: {
        type: "object",
        properties: {
          severity: { type: "string", enum: ["high", "medium", "low"] },
          area: { type: "string" },
          detail: { type: "string" },
          fix: { type: "string" },
        },
        required: ["severity", "area", "detail", "fix"],
        additionalProperties: false,
      },
    },
    summary: { type: "string" },
  },
  required: ["verdict", "issues", "summary"],
  additionalProperties: false,
} as const;

export async function precheckCampaign(input: PrecheckInput): Promise<{ ok: true; result: Precheck } | { ok: false; error: string }> {
  const userPrompt = `당신은 체험단(인플루언서 마케팅) 플랫폼의 운영자를 돕는 검수 보조입니다. 아래 캠페인 텍스트만 근거로, 승인 전에 확인할 문제를 찾아 JSON으로 답하세요. 법률 자문이 아니라 검수자용 체크포인트입니다.

점검 관점 (한국 표시·광고 관행 기준):
1. 의료·건강 효능 단정/과장 (치료·완치·다이어트 보장·질병 개선 등), 화장품의 의약품 오인 표현, 식품의 질병 예방 표현
2. 확정적 수익·효과 보장 ("무조건", "100%", "최저가 보장" 등 입증 불가)
3. 경제적 대가 표시 누락 — 미션에 "광고/협찬/체험단 표기(#광고 #협찬)"가 없거나 숨기라고 요구하는지 (표시광고법·공정위 지침)
4. 크리에이터에게 부당한 요구 — 개인정보(주민번호·계좌 사전 요구), 과도한 콘텐츠 수량 대비 낮은 제공/포인트, 저작권 전부 양도 강요, 부정 후기 삭제 조건
5. 미션·제공 내역·포인트 사이 불일치, 모집 인원·기간의 비현실성, 상호/브리프와 무관한 내용, 금지 업종(불법 도박·성인·대부업 등)
6. 표현 품질 — 오탈자·비속어·경쟁사 비방

규칙:
- 텍스트에 없는 사실을 가정하지 말 것. 확인 불가한 것은 이슈로 만들지 말고 summary 에 "직접 확인" 항목으로만 언급.
- issues 는 0~6개, severity: high(승인 보류 권장) / medium(수정 요청 권장) / low(참고). detail 은 문제 문구를 인용, fix 는 광고주에게 보낼 한 줄 수정 제안.
- verdict: high 가 있으면 block, medium 만 있으면 caution, 없으면 ok. summary 는 운영자용 2문장.
- 광고 표기 미션이 없다면 최소 medium 으로 지적한다 (체험단은 대가성 콘텐츠).

[캠페인]
제목: ${input.title}
상호: ${input.businessName}
업종/브리프: ${[input.category, input.industryBrief].filter(Boolean).join(" · ") || "-"}
홍보 유형: ${input.promotionType ?? "-"}
모집: ${input.recruitCount}명 · 모집기간 ${input.recruitDays}일 · 활동 포인트 ${input.pointAmount.toLocaleString()}P
미션:
${input.missions.map((m) => `- [${m.channel}] ${m.description}`).join("\n") || "- (없음)"}
키워드: ${input.keywords.join(", ") || "-"}
제공 내역:
${input.offerings.map((o) => `- ${o.title}${o.description ? ` — ${o.description}` : ""}${o.estimatedValue ? ` (약 ${o.estimatedValue.toLocaleString()}원)` : ""}`).join("\n") || "- (없음)"}`;

  try {
    const client = getAnthropic();
    const r = await client.messages.create({
      model: AI_MODEL_REASONING,
      max_tokens: 5000,
      thinking: { type: "adaptive" },
      output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA as unknown as Record<string, unknown> } },
      messages: [{ role: "user", content: userPrompt }],
    });
    const stopErr = stopReasonError(r.stop_reason);
    if (stopErr) return { ok: false, error: stopErr };
    const text = r.content.find((b) => b.type === "text")?.text ?? "";
    const parsed = JSON.parse(text) as Precheck;
    parsed.issues = (parsed.issues ?? []).slice(0, 6);
    return { ok: true, result: parsed };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "AI 점검 실패" };
  }
}
