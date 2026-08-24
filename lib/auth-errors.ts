/**
 * Supabase 인증 오류 → 한국어 안내 문구.
 * 메시지 패턴 → code(supabase-js v2 AuthApiError.code) 순으로 매칭하고,
 * 못 찾으면 원문 대신 일반 안내를 보여준다(영문 노출 방지).
 */

type MaybeAuthError = { code?: string; message?: string; status?: number } | string | null | undefined;

const BY_CODE: Record<string, string> = {
  invalid_credentials: "이메일 또는 비밀번호가 올바르지 않습니다.",
  email_not_confirmed: "이메일 인증이 아직 완료되지 않았어요. 받은 메일함에서 인증 링크를 눌러주세요.",
  user_already_exists: "이미 가입된 이메일입니다. 로그인하거나 비밀번호를 재설정해 주세요.",
  email_exists: "이미 가입된 이메일입니다. 로그인하거나 비밀번호를 재설정해 주세요.",
  user_not_found: "등록되지 않은 계정이에요. 이메일을 확인해 주세요.",
  weak_password: "비밀번호가 너무 단순해요. 더 길고 복잡한 비밀번호를 사용해 주세요.",
  same_password: "새 비밀번호는 이전 비밀번호와 달라야 합니다.",
  otp_expired: "링크가 만료되었어요. 다시 요청해 주세요.",
  validation_failed: "입력한 값을 다시 확인해 주세요.",
  email_address_invalid: "이메일 주소 형식이 올바르지 않습니다.",
  signup_disabled: "현재 신규 가입이 제한되어 있어요. 잠시 후 다시 시도해 주세요.",
  provider_disabled: "이 소셜 로그인은 아직 사용할 수 없어요. 이메일로 로그인해 주세요.",
  over_email_send_rate_limit: "메일 발송 한도를 넘었어요. 잠시 후 다시 시도해 주세요.",
  over_request_rate_limit: "요청이 너무 잦아요. 잠시 후 다시 시도해 주세요.",
  session_expired: "로그인 세션이 만료되었어요. 다시 로그인해 주세요.",
  refresh_token_not_found: "로그인 세션이 만료되었어요. 다시 로그인해 주세요.",
  bad_oauth_state: "소셜 로그인이 중단되었어요. 처음부터 다시 시도해 주세요.",
  flow_state_expired: "로그인 요청이 만료되었어요. 처음부터 다시 시도해 주세요.",
};

const BY_MESSAGE: { test: RegExp; ko: string | ((m: RegExpMatchArray) => string) }[] = [
  { test: /invalid login credentials/i, ko: "이메일 또는 비밀번호가 올바르지 않습니다." },
  { test: /email not confirmed|email address not confirmed/i, ko: "이메일 인증이 아직 완료되지 않았어요. 받은 메일함에서 인증 링크를 눌러주세요." },
  { test: /user already registered|already been registered|user already exists/i, ko: "이미 가입된 이메일입니다. 로그인하거나 비밀번호를 재설정해 주세요." },
  { test: /password should be at least (\d+)/i, ko: (m) => `비밀번호는 ${m[1]}자 이상이어야 합니다.` },
  { test: /new password should be different|different from the old password/i, ko: "새 비밀번호는 이전 비밀번호와 달라야 합니다." },
  { test: /for security purposes.*?(\d+) seconds/i, ko: (m) => `보안을 위해 ${m[1]}초 후에 다시 시도할 수 있어요.` },
  { test: /email rate limit exceeded|over_email_send_rate_limit/i, ko: "메일 발송 한도를 넘었어요. 잠시 후 다시 시도해 주세요." },
  { test: /request rate limit|too many requests/i, ko: "요청이 너무 잦아요. 잠시 후 다시 시도해 주세요." },
  { test: /token has expired or is invalid|email link is invalid or has expired|otp_expired/i, ko: "링크가 만료되었거나 유효하지 않아요. 다시 요청해 주세요." },
  { test: /unable to validate email address|invalid format|email address .* is invalid/i, ko: "이메일 주소 형식이 올바르지 않습니다." },
  { test: /signups not allowed|signup is disabled/i, ko: "현재 신규 가입이 제한되어 있어요. 잠시 후 다시 시도해 주세요." },
  { test: /unsupported provider|provider is not enabled/i, ko: "이 소셜 로그인은 아직 사용할 수 없어요. 이메일로 로그인해 주세요." },
  { test: /user not found/i, ko: "등록되지 않은 계정이에요. 이메일을 확인해 주세요." },
  { test: /password is known to be weak|weak password|pwned/i, ko: "많이 쓰이거나 유출된 비밀번호예요. 다른 비밀번호를 사용해 주세요." },
  { test: /invalid refresh token|refresh token not found|session.*expired|jwt expired/i, ko: "로그인 세션이 만료되었어요. 다시 로그인해 주세요." },
  { test: /captcha/i, ko: "보안 확인에 실패했어요. 새로고침 후 다시 시도해 주세요." },
  { test: /failed to fetch|network ?error|load failed|connection/i, ko: "네트워크 연결이 불안정해요. 잠시 후 다시 시도해 주세요." },
  { test: /database error/i, ko: "처리 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요." },
];

const FALLBACK = "요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.";

/** 한국어(또는 이미 번역된) 문구인지 — 한글이 들어 있으면 그대로 보여준다 */
const isKorean = (s: string) => /[가-힣]/.test(s);

export function authErrorMessage(err: MaybeAuthError, fallback = FALLBACK): string {
  if (!err) return fallback;
  const code = typeof err === "string" ? undefined : err.code;
  const raw = (typeof err === "string" ? err : err.message ?? "").trim();

  // 구체적인 메시지 패턴이 code 보다 우선 (validation_failed·weak_password 처럼 code 가 뭉뚱그려지는 경우)
  for (const rule of BY_MESSAGE) {
    const m = raw.match(rule.test);
    if (m) return typeof rule.ko === "function" ? rule.ko(m) : rule.ko;
  }
  if (code && BY_CODE[code]) return BY_CODE[code];
  if (raw && isKorean(raw)) return raw; // 우리가 만든 한국어 메시지는 그대로
  return fallback;
}

/** 로그인 페이지 ?error= 로 넘길 수 있는 키 — 임의 문구가 URL 로 주입되는 것을 막는다 */
export const AUTH_ERROR_PARAM: Record<string, string> = {
  oauth: "소셜 로그인에 실패했어요. 다시 시도해 주세요.",
  oauth_cancelled: "소셜 로그인이 취소되었어요.",
  oauth_disabled: "이 소셜 로그인은 아직 사용할 수 없어요. 이메일로 로그인해 주세요.",
  session: "로그인 세션이 만료되었어요. 다시 로그인해 주세요.",
};

export function authErrorFromParam(key: string | null | undefined): string | null {
  if (!key) return null;
  return AUTH_ERROR_PARAM[key] ?? AUTH_ERROR_PARAM.oauth;
}
