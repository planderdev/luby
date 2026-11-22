"use client";

import type { CampaignDraft } from "../actions";
import type { Region } from "../CampaignBuilder";
import { StepHeader, Field, TextInput, Select, TextArea } from "./_shared";
import { ImageUpload } from "@/components/ImageUpload";

/** 질문 1 — 무엇을 알리나요? */
export function StepAbout({
  draft,
  regions,
  update,
}: {
  draft: CampaignDraft;
  regions: Region[];
  update: <K extends keyof CampaignDraft>(key: K, value: CampaignDraft[K]) => void;
}) {
  const briefLen = draft.industry_brief.trim().length;
  return (
    <div className="space-y-6">
      <StepHeader
        title="무엇을 알리나요?"
        desc="매장이나 제품을 아는 만큼만 적어주세요. 제목·채널·미션 문장은 AI가 씁니다."
      />

      <div className="grid gap-5 md:grid-cols-2">
        <Field label="상호명·브랜드명">
          <TextInput
            value={draft.business_name}
            onChange={(v) => update("business_name", v)}
            placeholder="예: 루비뷰티 강남점"
            required
          />
        </Field>
        <Field label="활동 지역" hint="크리에이터를 찾을 지역">
          <Select
            value={draft.region_id}
            onChange={(v) => update("region_id", v)}
            options={regions.map((r) => ({ value: r.id, label: `${r.flag} ${r.name}` }))}
            placeholder="지역을 선택해주세요"
          />
        </Field>
      </div>

      <Field label="어떤 곳(제품)인가요?" hint="한두 문장이면 충분해요">
        <TextArea
          value={draft.industry_brief}
          onChange={(v) => update("industry_brief", v)}
          placeholder="예: 강남역 5분 거리 비건 카페예요. 이번에 비건 라떼 신메뉴가 나왔고, 20~30대 여성과 외국인 관광객이 많이 와요."
          rows={3}
        />
        <p className="mt-1.5 text-xs text-muted-foreground">
          {briefLen < 10
            ? "무엇을 파는지, 누가 주로 오는지, 이번에 알리고 싶은 것을 적어주세요."
            : "좋아요. 주 고객(연령·국적)과 이번에 알리고 싶은 것을 더 적을수록 가이드가 정확해져요."}
        </p>
      </Field>

      <Field label="매장·제품 링크" hint="선택 · 네이버 플레이스, 인스타그램, 상세페이지 등">
        <TextInput
          type="url"
          value={draft.guide.reference_url}
          onChange={(v) => update("guide", { ...draft.guide, reference_url: v })}
          placeholder="https://"
        />
        <p className="mt-1.5 text-xs text-muted-foreground">
          크리에이터가 방문·촬영 전에 참고할 수 있도록 가이드에 함께 보여줍니다.
        </p>
      </Field>

      <Field label="대표 사진" hint="선택 · 권장 16:9 (1280x720), 최대 5MB">
        <ImageUpload
          bucket="campaign-thumbnails"
          value={draft.thumbnail_url}
          onChange={(url) => update("thumbnail_url", url)}
          shape="rect"
        />
      </Field>
    </div>
  );
}
