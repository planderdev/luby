import { viewSourceRows } from "@/lib/view-sources";
import { trackedCreate, AI_MODEL_FAST, stopReasonError, type AiContext } from "./client";

/**
 * 성과 리포트 AI 요약 — 클라이언트 보고서 상단에 들어갈 임원용 요약.
 * 숫자는 입력된 집계만 사용하고, 없는 성과를 지어내지 않는다.
 */
export type ReportSummaryInput = {
  title: string;
  businessName: string;
  companyName: string;
  advertiserKind: "brand" | "agency";
  status: "open" | "closed" | "completed";
  category: string | null;
  promotion: string | null;
  industryBrief: string | null;
  channels: string[];
  recruitCount: number;
  pointAmount: number;
  recruitStart: string;
  recruitEnd: string;
  alwaysOpen: boolean;
  metrics: {
    applied: number;
    selected: number;
    submitted: number;
    approved: number;
    total_reach: number;
    points_paid: number;
    reach_by_channel: { channel: string; followers: number }[];
    page_views?: number;
    page_uniques?: number;
    views_by_source?: Record<string, number>;
  };
  contents: { creator_name: string | null; status: string; channels: { channel: string; followers: number | null }[] | null }[];
};

export type ReportSummary = {
  headline: string;
  summary: string;
  highlights: string[];
  next_steps: string[];
};

const SCHEMA = {
  type: "object",
  properties: {
    headline: { type: "string" },
    summary: { type: "string" },
    highlights: { type: "array", items: { type: "string" } },
    next_steps: { type: "array", items: { type: "string" } },
  },
  required: ["headline", "summary", "highlights", "next_steps"],
  additionalProperties: false,
} as const;

export async function summarizeCampaignReport(input: ReportSummaryInput, ctx?: Omit<AiContext, "feature">): Promise<{ ok: true; result: ReportSummary } | { ok: false; error: string }> {
  const m = input.metrics;
  const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);
  const statusKo = input.status === "open" ? "모집중" : input.status === "closed" ? "모집 마감·진행중" : "완료";
  const topCreators = input.contents
    .filter((c) => c.status === "approved")
    .slice(0, 5)
    .map((c) => `${c.creator_name ?? "크리에이터"}(${(c.channels ?? []).map((x) => `${x.channel} ${x.followers ?? 0}`).join(", ") || "채널 미등록"})`);

  const userPrompt = `당신은 인플루언서 체험단 마케팅 대행사의 AE 입니다. 아래 캠페인 집계만 근거로, 클라이언트에게 보낼 성과 보고서 상단 요약을 한국어로 작성하세요. 숫자는 주어진 값만 쓰고, 없는 성과(매출·전환·노출 수 등)는 절대 추정하지 마세요. "예상 도달"은 선정 크리에이터 팔로워 합산 근사치라는 점을 전제로 표현합니다.

형식:
- headline: 결과를 한 줄로 (20자 내외, 숫자 1개 포함)
- summary: 3~4문장. 모집 반응(응모·경쟁률) → 선정·발행 진행 → 도달/지급 순으로. 캠페인이 ${statusKo} 상태이므로 그에 맞는 시제.
- highlights: 2~3개, 각 1문장. 가장 의미 있는 수치를 해석(예: 경쟁률이 높다/낮다, 특정 채널 도달 집중, 승인율).
- next_steps: 2~3개, 각 1문장. 다음 캠페인/남은 기간에 대한 실행 제안 (채널 믹스·인원·포인트·기간 등). 광고주가 바로 결정할 수 있게 구체적으로.
- 과장·감탄 표현 금지, 담백한 보고 톤. 존댓말.

[캠페인]
제목: ${input.title}
브랜드·매장: ${input.businessName} / 운영: ${input.companyName}${input.advertiserKind === "agency" ? " (대행사)" : ""}
업종: ${input.category ?? "-"} · 홍보 유형: ${input.promotion ?? "-"} · 브리프: ${input.industryBrief ?? "-"}
채널: ${input.channels.join(", ") || "-"}
모집: ${input.recruitCount}명 · 보상 ${input.pointAmount.toLocaleString()}P/인 · 기간 ${input.recruitStart.slice(0, 10)} ~ ${input.alwaysOpen ? "상시" : input.recruitEnd.slice(0, 10)} · 상태 ${statusKo}

[집계]
응모 ${m.applied}명 (경쟁률 ${input.recruitCount > 0 ? (m.applied / input.recruitCount).toFixed(1) : "0"}:1)
선정 ${m.selected}명 (모집 진행률 ${pct(m.selected, input.recruitCount)}%)
콘텐츠 제출 ${m.submitted}건 · 승인 ${m.approved}건 (승인율 ${pct(m.approved, m.submitted)}%)
예상 도달 ${m.total_reach.toLocaleString()} (채널별: ${m.reach_by_channel.map((r) => `${r.channel} ${r.followers.toLocaleString()}`).join(", ") || "-"})
지급 포인트 ${m.points_paid.toLocaleString()}P
공개 페이지 조회 ${m.page_views ?? 0}회 · 순 방문 ${m.page_uniques ?? 0}명${(m.page_uniques ?? 0) > 0 ? ` (방문→응모 전환 ${pct(m.applied, m.page_uniques ?? 0)}%)` : ""} · 유입: ${viewSourceRows(m.views_by_source).map((r) => `${r.label} ${r.views}`).join(", ") || "기록 없음"}
승인 콘텐츠 크리에이터: ${topCreators.join("; ") || "-"}`;

  try {
    const r = await trackedCreate({
      model: AI_MODEL_FAST,
      max_tokens: 2500,
      thinking: { type: "adaptive" },
      output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA as unknown as Record<string, unknown> } },
      messages: [{ role: "user", content: userPrompt }],
    }, { feature: "report_summary", ...ctx });
    const stopErr = stopReasonError(r.stop_reason);
    if (stopErr) return { ok: false, error: stopErr };
    const text = r.content.find((b) => b.type === "text")?.text ?? "";
    const parsed = JSON.parse(text) as ReportSummary;
    parsed.highlights = (parsed.highlights ?? []).slice(0, 3);
    parsed.next_steps = (parsed.next_steps ?? []).slice(0, 3);
    return { ok: true, result: parsed };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "AI 요약 실패" };
  }
}
