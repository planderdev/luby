import { unstable_cache } from "next/cache";
import { getStaticSupabase } from "@/lib/supabase/static";

export type CatalogMeta = {
  regions: { id: string; code: string; name: string; flag: string }[];
  categories: { id: string; slug: string; name: string }[];
  channels: { id: string; slug: string; name: string }[];
  promotionTypes: { id: string; slug: string; name: string; description: string | null }[];
};

/**
 * Catalog metadata changes very rarely (only when admin edits the seed tables).
 * Cache for 5 minutes — saves a 4-table fetch on every campaign-builder load
 * and every AI call.
 */
export const fetchCatalog = unstable_cache(
  async (): Promise<CatalogMeta> => {
    const supabase = getStaticSupabase();
    const [regions, categories, channels, promotionTypes] = await Promise.all([
      supabase
        .from("regions")
        .select("id, code, name, flag")
        .eq("active", true)
        .order("sort_order"),
      supabase
        .from("categories")
        .select("id, slug, name")
        .eq("active", true)
        .order("sort_order"),
      supabase
        .from("channel_types")
        .select("id, slug, name")
        .eq("active", true)
        .order("sort_order"),
      supabase
        .from("promotion_types")
        .select("id, slug, name, description")
        .eq("active", true)
        .order("sort_order"),
    ]);

    return {
      regions: regions.data ?? [],
      categories: categories.data ?? [],
      channels: channels.data ?? [],
      promotionTypes: promotionTypes.data ?? [],
    };
  },
  ["catalog-meta-v1"],
  { revalidate: 300, tags: ["catalog"] }
);

/**
 * Stable system role description. Identical bytes across all calls — caches well.
 */
const SYSTEM_ROLE = `당신은 글로벌 체험단 마케팅 플랫폼 "루비AI"의 AI 마케팅 전문가입니다.

광고주들은 마케팅을 직접 할 시간·전문성이 없어서 우리 서비스를 유료로 사용합니다.
따라서 당신의 임무는 광고주가 입력한 최소한의 정보(보통은 업종 한 줄 설명)만으로
캠페인을 거의 완성된 상태까지 자동으로 작성해주는 것입니다.

작성 원칙:
1. **한국어로** 자연스럽고 매력적인 카피를 작성합니다. (특별한 요청이 없는 한)
2. 인플루언서가 매력을 느낄 수 있게 — 너무 딱딱하거나 사무적이지 않게.
3. 광고주의 업종·제품 특성을 반영해 구체적이고 차별적이게.
4. 글로벌 마켓을 의식 — 국가별 특성이 있다면 반영.
5. 거짓이나 과장은 금지. 광고주가 입력한 사실만 기반으로 작성.
6. JSON 응답은 항상 schema에 정확히 부합해야 합니다.`;

/**
 * Builds the catalog block — the available enums the AI must pick from.
 * Identical across all calls within a deploy, so caches well.
 */
function buildCatalogBlock(catalog: CatalogMeta): string {
  return `# 사용 가능한 메타데이터

다음 ID들 중에서만 선택하여 응답해야 합니다.

## 활동 가능 지역 (regions)
${catalog.regions.map((r) => `- ${r.id} : ${r.flag} ${r.name} (${r.code})`).join("\n")}

## 카테고리 (categories)
${catalog.categories.map((c) => `- ${c.id} : ${c.name} (${c.slug})`).join("\n")}

## SNS 채널 타입 (channel_types)
${catalog.channels.map((c) => `- ${c.id} : ${c.name} (${c.slug})`).join("\n")}

## 홍보 유형 (promotion_types)
${catalog.promotionTypes
  .map((p) => `- ${p.id} : ${p.name}${p.description ? ` — ${p.description}` : ""}`)
  .join("\n")}

${CHANNEL_GUIDE}`;
}

/**
 * 채널별 콘텐츠 형식·미션 작성 가이드 (slug 기준). 글로벌 채널(샤오홍슈·더우인·Lemon8)은
 * 현지 소비자가 실제로 읽는 형식을 지키는 게 성과의 핵심이라 별도로 명시한다.
 */
const CHANNEL_GUIDE = `# 채널별 콘텐츠 형식 가이드 (미션 작성 시 반드시 반영)

- instagram : 릴스(15~30초) 또는 피드 3~5장 + 캡션. 위치 태그·브랜드 계정 태그·해시태그 5~8개.
- youtube : 쇼츠(60초 내) 또는 3분 내외 브이로그 삽입. 제목·설명란 키워드, 고정 댓글에 매장/제품 정보.
- tiktok : 15~30초 세로 영상, 트렌드 사운드 활용 가능. 첫 2초 훅, 해시태그 3~5개.
- blog : 네이버 블로그 상세 후기 1,000자 이상 + 사진 10장 이상. 상호명·핵심 키워드 제목 포함, 지도/링크 첨부.
- threads : 짧은 텍스트 후기 + 사진 1~4장, 대화형 톤. 해시태그 1~2개.
- xiaohongshu : 샤오홍슈(小红书) '笔记' 형식 — 세로 커버 이미지 1장 + 사진 4~9장 또는 60초 내 영상, 제목 20자 내(중국어), 본문은 실사용 장단점·가격·위치(한국 여행 동선)·팁을 중국어로. 해시태그(#话题) 5~10개, 광고 티 나는 문구 금지(种草 톤). 중국·홍콩·대만·싱가포르 소비자/관광객 타깃일 때, 또는 K뷰티·K푸드·방문형 매장일 때 우선 추천.
- douyin : 더우인(抖音) 15~60초 세로 영상, 중국어 자막·POI(위치) 태그, 트렌드 BGM. 중국 본토 타깃일 때만.
- lemon8 : 카드형 사진 5~10장 + 짧은 텍스트 오버레이, 영어/일본어/현지어. 일본·동남아 타깃, 뷰티·푸드·라이프스타일에 적합.

공통 규칙:
- 채널당 미션은 1개, 60~150자, 액션 1~3개만 명확히.
- 글로벌 채널(xiaohongshu·douyin·lemon8) 미션에는 사용 언어를 명시하고, 필수 언급 키워드는 한국어+현지어를 병기한다. (예: "비건 라떼(纯素拿铁)")
- 광고주가 해외 타깃을 언급하지 않았고 방문형 국내 매장도 아니면 글로벌 채널을 억지로 넣지 않는다.`;

/**
 * Returns the system messages array with prompt caching enabled.
 * The first block is the role (stable forever), the second is the catalog
 * (stable until DB metadata changes). Cache-control on the second block
 * caches the entire prefix — including tools if any are added later.
 */
export function buildSystemBlocks(catalog: CatalogMeta) {
  return [
    { type: "text" as const, text: SYSTEM_ROLE },
    {
      type: "text" as const,
      text: buildCatalogBlock(catalog),
      cache_control: { type: "ephemeral" as const },
    },
  ];
}
