"use server";

import { createClient } from "@/lib/supabase/server";
import { getAnthropic, AI_MODEL_FAST, stopReasonError } from "@/lib/ai/client";

/**
 * 크리에이터 응모 메시지 AI 초안 — 캠페인 미션·키워드 + 내 프로필(소개·채널·분야)만으로
 * 2~3문장. 과장·거짓 금지, 실제 데이터에 없는 수치는 쓰지 않는다. Sonnet 5 · effort low.
 */
export async function suggestApplicationMessage(
  campaignId: string
): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const [{ data: profile }, { data: camp }] = await Promise.all([
    supabase.from("profiles").select("name, role, approved").eq("id", user.id).maybeSingle(),
    supabase
      .from("campaigns")
      .select("id, title, business_name, industry_brief, point_amount, status, category_id, region_id")
      .eq("id", campaignId)
      .maybeSingle(),
  ]);
  if (!profile || profile.role !== "influencer") return { ok: false, error: "크리에이터만 사용할 수 있어요." };
  if (!profile.approved) return { ok: false, error: "계정 승인 후 사용할 수 있어요." };
  if (!camp || camp.status !== "open") return { ok: false, error: "모집 중인 캠페인이 아닙니다." };

  const [{ data: inf }, { data: channels }, { data: cats }, { data: missions }, { data: keywords }, { data: catRow }] =
    await Promise.all([
      supabase.from("influencers").select("bio, region_id").eq("profile_id", user.id).maybeSingle(),
      supabase.from("influencer_channels").select("followers, handle, channel_types(name)").eq("influencer_id", user.id),
      supabase.from("influencer_categories").select("categories(name)").eq("influencer_id", user.id),
      supabase.from("campaign_missions").select("description, channel_types(name)").eq("campaign_id", campaignId),
      supabase.from("campaign_keywords").select("keyword").eq("campaign_id", campaignId),
      camp.category_id ? supabase.from("categories").select("name").eq("id", camp.category_id).maybeSingle() : Promise.resolve({ data: null }),
    ]);

  type Named = { name: string } | { name: string }[] | null;
  const nameOf = (n: Named) => (Array.isArray(n) ? n[0]?.name : n?.name) ?? "";
  const myChannels = (channels ?? [])
    .map((c) => `${nameOf(c.channel_types as Named)}${c.handle ? ` ${c.handle}` : ""}${c.followers ? ` (팔로워 ${c.followers.toLocaleString()})` : ""}`)
    .filter(Boolean);
  const myCats = (cats ?? []).map((c) => nameOf(c.categories as Named)).filter(Boolean);
  const missionLines = (missions ?? []).map((m) => `- [${nameOf(m.channel_types as Named)}] ${m.description}`);
  const kw = (keywords ?? []).map((k) => k.keyword);

  const userPrompt = `당신은 체험단 플랫폼의 크리에이터를 돕는 어시스턴트입니다. 아래 정보만 사용해 광고주에게 보낼 **응모 메시지**를 한국어 2~3문장(공백 포함 120~220자)으로 작성하세요.

규칙:
- 실제 정보에 없는 수치·경력·수상은 절대 지어내지 않는다. 채널/팔로워/분야가 비어 있으면 언급하지 않는다.
- 캠페인의 미션·키워드 중 1~2개를 구체적으로 어떻게 소화할지 한 문장으로 제안한다.
- 겸손하되 자신감 있게, 이모지 최대 1개, 해시태그·인사말 반복 금지, "귀사" 같은 딱딱한 표현 금지.
- 출력은 메시지 본문만 (따옴표·제목·설명 없이).

[캠페인]
제목: ${camp.title}
상호: ${camp.business_name}
업종/브리프: ${[nameOf(catRow as Named), camp.industry_brief].filter(Boolean).join(" · ") || "-"}
미션:
${missionLines.join("\n") || "- (미션 미기재)"}
키워드: ${kw.join(", ") || "-"}

[나]
이름: ${profile.name}
소개: ${inf?.bio?.trim() || "-"}
채널: ${myChannels.join(" / ") || "-"}
전문 분야: ${myCats.join(", ") || "-"}`;

  try {
    const client = getAnthropic();
    const r = await client.messages.create({
      model: AI_MODEL_FAST,
      max_tokens: 1500,
      thinking: { type: "adaptive" },
      output_config: { effort: "low" },
      messages: [{ role: "user", content: userPrompt }],
    });
    const stopErr = stopReasonError(r.stop_reason);
    if (stopErr) return { ok: false, error: stopErr };
    const text = (r.content.find((b) => b.type === "text")?.text ?? "").trim().replace(/^["“]|["”]$/g, "");
    if (!text) return { ok: false, error: "초안을 만들지 못했어요. 다시 시도해 주세요." };
    return { ok: true, message: text.slice(0, 500) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "AI 호출에 실패했습니다." };
  }
}
