import { getAnthropic, AI_MODEL_REASONING, stopReasonError } from "./client";

/**
 * 응모자 AI 적합도 평가 — 캠페인 조건 대비 응모 크리에이터를 0~100점으로 평가하고 근거를 붙인다.
 * 주어진 프로필·채널·메시지 텍스트만 근거로 하며, 확인 불가한 품질(콘텐츠 퀄리티 등)은 추정하지 않는다.
 */
export type FitCampaign = {
  title: string;
  businessName: string;
  industryBrief: string | null;
  category: string | null;
  region: string | null;
  promotionType: string | null;
  channels: string[];
  missions: { channel: string; description: string }[];
  keywords: string[];
  pointAmount: number;
  recruitCount: number;
};

export type FitApplicant = {
  id: string;
  name: string;
  region: string | null;
  categories: string[];
  bio: string | null;
  channels: { channel: string; handle: string | null; followers: number | null }[];
  completedCampaigns: number;
  message: string | null;
};

export type ApplicantFit = {
  score: number;
  fit: "high" | "medium" | "low";
  reasons: string[];
  caution: string | null;
};

const SCHEMA = {
  type: "object",
  properties: {
    results: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          score: { type: "integer" },
          fit: { type: "string", enum: ["high", "medium", "low"] },
          reasons: { type: "array", items: { type: "string" } },
          caution: { type: ["string", "null"] },
        },
        required: ["id", "score", "fit", "reasons", "caution"],
        additionalProperties: false,
      },
    },
  },
  required: ["results"],
  additionalProperties: false,
} as const;

export async function scoreApplicants(campaign: FitCampaign, applicants: FitApplicant[]): Promise<{ ok: true; results: Map<string, ApplicantFit> } | { ok: false; error: string }> {
  if (applicants.length === 0) return { ok: true, results: new Map() };

  const userPrompt = `당신은 인플루언서 체험단 캠페인의 선정을 돕는 어시스턴트입니다. 아래 캠페인 조건과 응모자 정보를 대조해 응모자마다 적합도를 평가하세요. 주어진 텍스트만 근거로 하고, 콘텐츠 품질·성실성처럼 확인할 수 없는 것은 추정하지 마세요.

평가 기준 (중요도 순):
1. 채널 일치 — 캠페인이 요구하는 채널을 실제로 운영하는가 (미등록 채널만 있으면 큰 감점)
2. 분야·업종 일치 — 전문 분야가 캠페인 업종/키워드와 맞는가
3. 지역 — 방문형이면 활동 지역이 캠페인 지역과 같은가 (배송형·온라인은 영향 적음)
4. 도달 — 팔로워 규모가 보상(포인트) 수준과 균형이 맞는가 (과도하게 크거나 작은지)
5. 응모 메시지 — 미션을 이해했는지, 구체적인 계획이 있는지 (없으면 중립)
6. 경험 — 체험 완료 이력

출력 규칙:
- results 는 입력된 응모자 id 를 모두 포함하고 id 를 그대로 쓴다.
- score 0~100 정수. fit: 75 이상 high, 45~74 medium, 그 외 low.
- reasons 1~2개, 각 한 문장 (40자 내외, 근거가 되는 수치·항목 인용). caution 은 선정 전 확인할 점이 있을 때만 한 문장, 없으면 null.
- 존댓말 없이 담백한 명사형 문장. 과장·칭찬 금지.

[캠페인]
제목: ${campaign.title} / 상호: ${campaign.businessName}
업종·브리프: ${[campaign.category, campaign.industryBrief].filter(Boolean).join(" · ") || "-"}
지역: ${campaign.region ?? "-"} · 홍보 유형: ${campaign.promotionType ?? "-"}
모집 ${campaign.recruitCount}명 · 보상 ${campaign.pointAmount.toLocaleString()}P
요구 채널: ${campaign.channels.join(", ") || "-"}
미션:
${campaign.missions.map((m) => `- [${m.channel}] ${m.description}`).join("\n") || "- (없음)"}
키워드: ${campaign.keywords.join(", ") || "-"}

[응모자]
${applicants
  .map(
    (a) => `id: ${a.id}
이름: ${a.name} · 지역: ${a.region ?? "-"} · 분야: ${a.categories.join(", ") || "-"} · 체험 완료 ${a.completedCampaigns}건
채널: ${a.channels.map((c) => `${c.channel}${c.handle ? ` @${c.handle.replace(/^@/, "")}` : ""} (${(c.followers ?? 0).toLocaleString()})`).join(", ") || "(미등록)"}
소개: ${(a.bio ?? "").slice(0, 200) || "-"}
응모 메시지: ${(a.message ?? "").slice(0, 400) || "-"}`
  )
  .join("\n\n")}`;

  try {
    const client = getAnthropic();
    const r = await client.messages.create({
      model: AI_MODEL_REASONING,
      max_tokens: 8000,
      thinking: { type: "adaptive" },
      output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA as unknown as Record<string, unknown> } },
      messages: [{ role: "user", content: userPrompt }],
    });
    const stopErr = stopReasonError(r.stop_reason);
    if (stopErr) return { ok: false, error: stopErr };
    const text = r.content.find((b) => b.type === "text")?.text ?? "";
    const parsed = JSON.parse(text) as { results: ({ id: string } & ApplicantFit)[] };
    const valid = new Set(applicants.map((a) => a.id));
    const results = new Map<string, ApplicantFit>();
    for (const x of parsed.results ?? []) {
      if (!valid.has(x.id)) continue; // 환각 id 제거
      const score = Math.max(0, Math.min(100, Math.round(Number(x.score) || 0)));
      results.set(x.id, {
        score,
        fit: score >= 75 ? "high" : score >= 45 ? "medium" : "low",
        reasons: (x.reasons ?? []).slice(0, 2),
        caution: x.caution || null,
      });
    }
    return { ok: true, results };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "AI 평가 실패" };
  }
}
