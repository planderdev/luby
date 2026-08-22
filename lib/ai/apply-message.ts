import { trackedCreate, AI_MODEL_FAST, stopReasonError, type AiContext } from "@/lib/ai/client";

export type ApplyMessageInput = {
  campaign: { title: string; business_name: string; category: string | null; industry_brief: string | null };
  missions: { channel: string; description: string }[];
  keywords: string[];
  me: { name: string; bio: string | null; channels: string[]; categories: string[] };
  /** 선정 가능성 맥락 (campaign_fit_hint) — 없으면 생략 */
  fit?: {
    applied: number;
    recruit_count: number;
    cat_hit: boolean;
    channels_have: string[];
    channels_missing: string[];
    my_completed: number;
  } | null;
};

/** 응모 메시지 프롬프트 — 실제 데이터만, 상황(경쟁률·채널·이력)에 맞춰 강조점을 바꾼다 */
export function buildApplyMessagePrompt(i: ApplyMessageInput): string {
  const f = i.fit;
  const ratio = f && f.recruit_count > 0 ? f.applied / f.recruit_count : 0;
  const situation: string[] = [];
  if (f) {
    situation.push(`경쟁률 ${ratio.toFixed(1)}:1 (응모 ${f.applied} / 모집 ${f.recruit_count})${ratio >= 2 ? " — 경쟁이 높음" : ratio < 1 ? " — 아직 자리 여유 있음" : ""}`);
    if (f.channels_have.length > 0) situation.push(`내가 가진 캠페인 채널: ${f.channels_have.join(", ")}`);
    if (f.channels_missing.length > 0) situation.push(`캠페인이 원하지만 내가 등록하지 않은 채널: ${f.channels_missing.join(", ")}`);
    situation.push(f.cat_hit ? "캠페인 분야가 내 전문 분야와 일치" : "캠페인 분야가 내 전문 분야와 다름");
    if (f.my_completed > 0) situation.push(`루비AI에서 완료한 체험 ${f.my_completed}건 (실제 데이터, 언급 가능)`);
  }
  const strategy: string[] = [];
  if (ratio >= 2) strategy.push("경쟁이 높으니 미션을 어떻게 구체적으로 풀지(구성·촬영·업로드 계획) 한 문장으로 차별화한다.");
  if (f && f.channels_have.length > 0) strategy.push("내가 가진 채널 중심으로 미션 소화 방법을 말한다.");
  if (f && f.channels_missing.length > 0) strategy.push("등록하지 않은 채널은 '곧 개설', '운영 중' 등으로 꾸며내지 말고 아예 언급하지 않는다.");
  if (f && !f.cat_hit) strategy.push("전문 분야가 다르면 전문성을 과장하지 말고, 이 캠페인과 내 콘텐츠의 연결점(관심·생활 맥락)을 솔직하게 한 구절로 적는다.");
  if (f && f.my_completed > 0) strategy.push("완료한 체험 건수를 신뢰 근거로 짧게 넣을 수 있다(정확한 숫자만).");

  return `당신은 체험단 플랫폼의 크리에이터를 돕는 어시스턴트입니다. 아래 정보만 사용해 광고주에게 보낼 **응모 메시지**를 한국어 2~3문장(공백 포함 120~220자)으로 작성하세요.

규칙:
- 실제 정보에 없는 수치·경력·수상·채널은 절대 지어내지 않는다. 채널/팔로워/분야가 비어 있으면 언급하지 않는다.
- 캠페인의 미션·키워드 중 1~2개를 구체적으로 어떻게 소화할지 한 문장으로 제안한다.
- 겸손하되 자신감 있게, 이모지 최대 1개, 해시태그·인사말 반복 금지, "귀사" 같은 딱딱한 표현 금지.
- 경쟁률·선정 가능성 같은 플랫폼 내부 수치는 메시지에 쓰지 않는다(전략 참고용).
- 출력은 메시지 본문만 (따옴표·제목·설명 없이).
${strategy.length ? `\n전략:\n${strategy.map((s) => `- ${s}`).join("\n")}\n` : ""}
[캠페인]
제목: ${i.campaign.title}
상호: ${i.campaign.business_name}
업종/브리프: ${[i.campaign.category, i.campaign.industry_brief].filter(Boolean).join(" · ") || "-"}
미션:
${i.missions.map((m) => `- [${m.channel}] ${m.description}`).join("\n") || "- (미션 미기재)"}
키워드: ${i.keywords.join(", ") || "-"}

[나]
이름: ${i.me.name}
소개: ${i.me.bio?.trim() || "-"}
채널: ${i.me.channels.join(" / ") || "-"}
전문 분야: ${i.me.categories.join(", ") || "-"}
${situation.length ? `\n[상황 — 메시지에 직접 쓰지 말 것]\n${situation.map((s) => `- ${s}`).join("\n")}` : ""}`;
}

/** Sonnet 5 · effort low. 반환: 메시지 본문 */
export async function draftApplyMessage(input: ApplyMessageInput, ctx: Omit<AiContext, "feature">): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  try {
    const r = await trackedCreate({
      model: AI_MODEL_FAST,
      max_tokens: 1500,
      thinking: { type: "adaptive" },
      output_config: { effort: "low" },
      messages: [{ role: "user", content: buildApplyMessagePrompt(input) }],
    }, { feature: "apply_message", ...ctx });
    const stopErr = stopReasonError(r.stop_reason);
    if (stopErr) return { ok: false, error: stopErr };
    const text = (r.content.find((b) => b.type === "text")?.text ?? "").trim().replace(/^["“]|["”]$/g, "");
    if (!text) return { ok: false, error: "초안을 만들지 못했어요. 다시 시도해 주세요." };
    return { ok: true, message: text.slice(0, 500) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "AI 호출에 실패했습니다." };
  }
}
