import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { fetchUICatalog } from "@/lib/cache/ui-catalog";
import { CampaignBuilder } from "../../new/CampaignBuilder";
import type { CampaignDraft } from "../../new/actions";

export const metadata = { title: "캠페인 수정 — 루비AI" };
export const maxDuration = 60;

/** 캠페인 수정 — 소유주, 초안·검수중·반려(취소) 상태만. 모집 시작 후에는 복제 이용 */
export default async function EditCampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  if (!profile) redirect(`/login?redirect=/dashboard/campaigns/${id}/edit`);
  if (profile.role !== "advertiser") redirect(`/dashboard/campaigns/${id}`);

  const supabase = await createClient();
  const { data: src } = await supabase
    .from("campaigns")
    .select("id, advertiser_id, status, title, business_name, industry_brief, thumbnail_url, contact_phone, region_id, promotion_type_id, category_id, recruit_start, recruit_end, experience_start, experience_end, same_day_reservation, always_open, recruit_count, point_amount, review_note")
    .eq("id", id)
    .eq("advertiser_id", profile.id)
    .maybeSingle();
  if (!src) redirect("/dashboard/campaigns");
  if (!["draft", "pending_approval", "cancelled", "rejected"].includes(src.status)) redirect(`/dashboard/campaigns/${id}`);

  const [{ data: ch }, { data: ms }, { data: kw }, { data: of }, { data: sc }, catalog] = await Promise.all([
    supabase.from("campaign_channels").select("channel_type_id").eq("campaign_id", id),
    supabase.from("campaign_missions").select("channel_type_id, description").eq("campaign_id", id),
    supabase.from("campaign_keywords").select("keyword").eq("campaign_id", id),
    supabase.from("campaign_offerings").select("title, description, estimated_value").eq("campaign_id", id),
    supabase.from("campaign_schedules").select("day_of_week, start_time, end_time").eq("campaign_id", id),
    fetchUICatalog(),
  ]);
  // datetime-local 값 (YYYY-MM-DDTHH:mm). 생성 시 입력 문자열을 그대로 timestamptz 로 저장하므로
  // 같은 방식(UTC 기준 슬라이스)으로 되돌려야 수정 저장 시 시각이 밀리지 않는다.
  const toLocal = (iso: string | null) => (iso ? new Date(iso).toISOString().slice(0, 16) : "");
  const initial: Partial<CampaignDraft> = {
    title: src.title,
    business_name: src.business_name,
    industry_brief: src.industry_brief ?? "",
    thumbnail_url: src.thumbnail_url ?? "",
    contact_phone: src.contact_phone ?? "",
    region_id: src.region_id,
    promotion_type_id: src.promotion_type_id,
    category_id: src.category_id,
    channel_type_ids: (ch ?? []).map((c) => c.channel_type_id),
    missions: (ms ?? []).map((m) => ({ channel_type_id: m.channel_type_id, description: m.description })),
    recruit_start: toLocal(src.recruit_start),
    recruit_end: toLocal(src.recruit_end),
    experience_start: src.experience_start ? toLocal(src.experience_start) : null,
    experience_end: src.experience_end ? toLocal(src.experience_end) : null,
    same_day_reservation: src.same_day_reservation,
    always_open: src.always_open,
    schedules: (sc ?? []).filter((s) => s.day_of_week !== null).map((s) => ({ day_of_week: s.day_of_week as number, start_time: s.start_time ?? "", end_time: s.end_time ?? "" })),
    recruit_count: src.recruit_count,
    keywords: (kw ?? []).map((k) => k.keyword),
    offerings: (of ?? []).map((o) => ({ title: o.title, description: o.description ?? "", estimated_value: o.estimated_value })),
    point_amount: src.point_amount,
  };

  return (
    <CampaignBuilder
      editId={id}
      reviewNote={src.status === "rejected" ? src.review_note : null}
      initial={initial}
      regions={catalog.regions}
      categories={catalog.categories}
      channels={catalog.channels}
      promotionTypes={catalog.promotionTypes}
    />
  );
}
