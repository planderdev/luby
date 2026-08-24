/**
 * DB·스토리지 오류 → 한국어 안내 문구.
 *
 * 우리 트리거·RPC 의 `raise exception` 메시지는 이미 한국어라 그대로 통과시키고
 * (`P0001: 최소 출금 금액은 10,000P입니다.` 처럼 붙는 접두어만 제거),
 * Postgres/PostgREST/Storage 의 영문 오류는 코드·패턴으로 매핑한다.
 * 어디에도 걸리지 않으면 원문 대신 fallback 을 보여준다(영문 노출 방지).
 */

type MaybeDbError = { code?: string; message?: string; details?: string | null; hint?: string | null } | string | null | undefined;

/** Postgres SQLSTATE / PostgREST 코드 */
const BY_CODE: Record<string, string> = {
  "23505": "이미 등록된 값이에요. 중복되지 않는 값으로 입력해 주세요.",
  "23503": "연결된 데이터가 없어요. 새로고침 후 다시 시도해 주세요.",
  "23502": "필수 항목이 비어 있어요. 모두 채운 뒤 저장해 주세요.",
  "23514": "입력한 값이 허용 범위를 벗어났어요. 다시 확인해 주세요.",
  "22001": "입력이 너무 길어요. 글자 수를 줄여 주세요.",
  "22P02": "입력 형식이 올바르지 않아요. 숫자·날짜 형식을 확인해 주세요.",
  "42501": "권한이 없어요. 본인 소유 항목인지 확인해 주세요.",
  "40001": "동시에 저장되어 실패했어요. 잠시 후 다시 시도해 주세요.",
  "40P01": "동시에 저장되어 실패했어요. 잠시 후 다시 시도해 주세요.",
  "57014": "처리 시간이 초과됐어요. 잠시 후 다시 시도해 주세요.",
  "53300": "서버가 혼잡해요. 잠시 후 다시 시도해 주세요.",
  PGRST116: "대상을 찾을 수 없어요. 이미 삭제되었을 수 있습니다.",
  PGRST301: "로그인 세션이 만료되었어요. 다시 로그인해 주세요.",
  PGRST204: "저장할 항목을 찾지 못했어요. 새로고침 후 다시 시도해 주세요.",
};

const BY_MESSAGE: { test: RegExp; ko: string }[] = [
  { test: /row-level security|violates row-level security policy/i, ko: "권한이 없어요. 본인 소유 항목인지 확인해 주세요." },
  { test: /duplicate key value|already exists/i, ko: "이미 등록된 값이에요. 중복되지 않는 값으로 입력해 주세요." },
  { test: /foreign key constraint/i, ko: "연결된 데이터가 없어요. 새로고침 후 다시 시도해 주세요." },
  { test: /violates not-null constraint/i, ko: "필수 항목이 비어 있어요. 모두 채운 뒤 저장해 주세요." },
  { test: /value too long/i, ko: "입력이 너무 길어요. 글자 수를 줄여 주세요." },
  { test: /invalid input syntax/i, ko: "입력 형식이 올바르지 않아요. 숫자·날짜 형식을 확인해 주세요." },
  { test: /jwt (expired|is expired)|token is expired/i, ko: "로그인 세션이 만료되었어요. 다시 로그인해 주세요." },
  { test: /permission denied|insufficient privilege|not authorized/i, ko: "권한이 없어요. 본인 소유 항목인지 확인해 주세요." },
  // Storage
  { test: /exceeded the maximum allowed size|payload too large|entity too large/i, ko: "파일 용량이 너무 커요. 더 작은 파일로 다시 올려주세요." },
  { test: /mime type .* is not supported|invalid mime type/i, ko: "지원하지 않는 파일 형식이에요. 이미지 파일(JPG·PNG·WebP)로 올려주세요." },
  { test: /object not found|not_found/i, ko: "대상을 찾을 수 없어요. 이미 삭제되었을 수 있습니다." },
  { test: /bucket not found/i, ko: "저장소를 찾을 수 없어요. 운영팀에 문의해 주세요." },
  // 네트워크·일시 오류
  { test: /failed to fetch|network ?error|fetch failed|socket hang up|ECONNRESET/i, ko: "네트워크 연결이 불안정해요. 잠시 후 다시 시도해 주세요." },
  { test: /timeout|timed out/i, ko: "처리 시간이 초과됐어요. 잠시 후 다시 시도해 주세요." },
];

const FALLBACK = "저장하지 못했어요. 잠시 후 다시 시도해 주세요.";
const hasKorean = (s: string) => /[가-힣]/.test(s);

/**
 * @param err  PostgrestError / StorageError / Error / 문자열
 * @param fallback 매칭 실패 시 보여줄 한국어 문구 (기본: 저장 실패 안내)
 */
export function dbErrorMessage(err: MaybeDbError, fallback = FALLBACK): string {
  if (!err) return fallback;
  const code = typeof err === "string" ? undefined : err.code;
  const raw = (typeof err === "string" ? err : err.message ?? "").trim();

  // 우리 함수가 raise 한 한국어 메시지는 그대로 (앞의 "P0001: " 같은 접두어만 제거)
  if (raw && hasKorean(raw)) {
    const cleaned = raw.replace(/^[A-Za-z0-9]+:\s*/, "").trim();
    return cleaned || fallback;
  }
  for (const rule of BY_MESSAGE) if (rule.test.test(raw)) return rule.ko;
  if (code && BY_CODE[code]) return BY_CODE[code];
  return fallback;
}

/** "채널 추가 실패: <원문>" 형태를 대체 — 접두어와 한국어 사유를 함께 만든다 */
export function dbErrorWith(prefix: string, err: MaybeDbError, fallback = FALLBACK): string {
  return `${prefix}: ${dbErrorMessage(err, fallback)}`;
}
