import { revalidatePath, revalidateTag } from "next/cache";

/**
 * 공개 페이지 온디맨드 재검증.
 *
 * 공개 페이지(/c/[id], /p/[id], 디렉터리)는 CDN·ISR 에 캐시된다(캠페인·프로필 300초, 목록 60초).
 * 상태·내용이 바뀌는 순간에는 기다리지 말고 즉시 새로 만들어야 방문자가 옛 화면을 보지 않는다.
 * (응모자 수처럼 자주 변하고 조금 늦어도 되는 값은 캐시 만료에 맡긴다)
 */

const LOCALE_PREFIXES = ["", "/en", "/zh"] as const;

/** 캠페인 검수 결과·수정·취소·모집 조정 직후 호출 */
export function revalidatePublicCampaign(campaignId: string) {
  revalidateTag("public-campaigns"); // 상세 RPC + 디렉터리 목록 + 비슷한 캠페인
  for (const p of LOCALE_PREFIXES) revalidatePath(`${p}/c/${campaignId}`);
}

/** 공개 프로필 공개 여부·내용이 바뀐 직후 호출 */
export function revalidatePublicCreator(profileId: string) {
  revalidateTag("public-creators");
  for (const p of LOCALE_PREFIXES) revalidatePath(`${p}/p/${profileId}`);
}
