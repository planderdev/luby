/**
 * URL 쿼리값 정리 — 목록·검색 화면의 필터 파라미터용.
 *
 * 잘못된 값(오래된 링크, 손으로 고친 주소, 슬러그와 uuid 혼용)이 그대로 DB 로 가면
 * Postgres 가 22P02(uuid 형식 오류)로 거절하고, 그 오류를 삼키면 "결과 없음" 처럼 보인다.
 * 여기서 걸러 낸 값은 "필터 없음"으로 취급한다.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** uuid 형식이면 그대로, 아니면 null */
export function asUuid(value: string | null | undefined): string | null {
  const v = value?.trim();
  return v && UUID.test(v) ? v : null;
}

/** 허용 목록에 있으면 그대로, 아니면 fallback */
export function asOneOf<T extends string>(value: string | null | undefined, allowed: readonly T[], fallback: T): T {
  const v = value?.trim();
  return v && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}
