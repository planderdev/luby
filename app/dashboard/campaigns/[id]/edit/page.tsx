import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { fetchUICatalog } from "@/lib/cache/ui-catalog";
import { CampaignBuilder } from "../../new/CampaignBuilder";
import { parseGuide } from "@/lib/campaign-guide";
import type { CampaignDraft } from "../../new/actions";
import { kstInputValue } from "@/lib/kst";

export const metadata = { title: "캠페인 수정 — 루비AI" };
export const maxDuration = 60;

/** 캠페인 수정 — 소유주(초안·검수중·반려·취소) + 운영자(모집중 정정 포함, 상태는 보존됨) */
export default async function EditCampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  if (!profile) redirect(`/login?redirect=/dashboard/campaigns/${id}/edit`);
  const isOperator = profile.role === "operator";
  if (profile.role !== "advertiser" && !isOperator) redirect(`/dashboard/campaigns/${id}`);

  const supabase = await createClient();
  let q = supabase
    .from("campaigns")
    .select("id, advertiser_id, status, title, business_name, industry_brief, thumbnail_url, contact_phone, region_id, promotion_type_id, category_id, recruit_start, recruit_end, experience_start, experience_end, same_day_reservation, always_open, recruit_count, point_amount, review_note, guide")
    .eq("id", id);
  if (!isOperator) q = q.eq("advertiser_id", profile.id);
  const { data: src } = await q.maybeSingle();
  if (!src) redirect("/dashboard/campaigns");
  const editable = isOperator
    ? ["draft", "pending_approval", "cancelled", "rejected", "open"]
    : ["draft", "pending_approval", "cancelled", "rejected"];
  if (!editable.includes(src.status)) redirect(`/dashboard/campaigns/${id}`);

  const [{ data: ch }, { data: ms }, { data: kw }, { data: of }, { data: sc }, catalog] = await Promise.all([
    supabase.from("campaign_channels").select("channel_type_id").eq("campaign_id", id),
    supabase.from("campaign_missions").select("channel_type_id, description").eq("campaign_id", id),
    supabase.from("campaign_keywords").select("keyword").eq("campaign_id", id),
    supabase.from("campaign_offerings").select("title, description, estimated_value").eq("campaign_id", id),
    supabase.from("campaign_schedules").select("day_of_week, start_time, end_time").eq("campaign_id", id),
    fetchUICatalog(),
  ]);
  // datetime-local 값 (YYYY-MM-DDTHH:mm) — 저장할 때 한국 시간으로 해석하므로 한국 시간으로 되돌려 채운다
  const toLocal = (iso: string | null) => (iso ? kstInputValue(iso) : "");
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
    guide: parseGuide(src.guide),
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
