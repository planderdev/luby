/**
 * Supabase 인증 오류 → 사용자 언어 안내 문구(ko/en/zh).
 * 메시지 패턴 → code(supabase-js v2 AuthApiError.code) 순으로 매칭하고, 못 찾으면 원문 대신 일반 안내를 보여준다.
 */
import type { Locale } from "@/lib/i18n/config";

type MaybeAuthError = { code?: string; message?: string; status?: number } | string | null | undefined;
type L = Record<Locale, string>;
const t = (ko: string, en: string, zh: string): L => ({ ko, en, zh });

const M = {
  invalidCredentials: t("이메일 또는 비밀번호가 올바르지 않습니다.", "The email or password is incorrect.", "邮箱或密码不正确。"),
  notConfirmed: t("이메일 인증이 아직 완료되지 않았어요. 받은 메일함에서 인증 링크를 눌러주세요.", "Your email isn't verified yet. Click the verification link in your inbox.", "邮箱尚未验证，请点击收件箱中的验证链接。"),
  exists: t("이미 가입된 이메일입니다. 로그인하거나 비밀번호를 재설정해 주세요.", "This email is already registered. Log in or reset your password.", "该邮箱已注册，请登录或重置密码。"),
  notFound: t("등록되지 않은 계정이에요. 이메일을 확인해 주세요.", "We couldn't find that account. Check the email address.", "未找到该账号，请检查邮箱。"),
  weak: t("비밀번호가 너무 단순해요. 더 길고 복잡한 비밀번호를 사용해 주세요.", "That password is too simple. Use a longer, more complex one.", "密码过于简单，请使用更长更复杂的密码。"),
  same: t("새 비밀번호는 이전 비밀번호와 달라야 합니다.", "The new password must differ from the old one.", "新密码必须与旧密码不同。"),
  expired: t("링크가 만료되었거나 유효하지 않아요. 다시 요청해 주세요.", "The link has expired or is invalid. Please request a new one.", "链接已过期或无效，请重新申请。"),
  validation: t("입력한 값을 다시 확인해 주세요.", "Please check what you entered.", "请检查输入内容。"),
  invalidEmail: t("이메일 주소 형식이 올바르지 않습니다.", "The email address format is invalid.", "邮箱地址格式不正确。"),
  signupDisabled: t("현재 신규 가입이 제한되어 있어요. 잠시 후 다시 시도해 주세요.", "Sign-ups are temporarily limited. Please try again later.", "目前暂停新用户注册，请稍后重试。"),
  providerDisabled: t("이 소셜 로그인은 아직 사용할 수 없어요. 이메일로 로그인해 주세요.", "This social login isn't available yet. Please log in with email.", "该社交登录暂不可用，请使用邮箱登录。"),
  emailRate: t("메일 발송 한도를 넘었어요. 잠시 후 다시 시도해 주세요.", "Email sending limit reached. Please try again later.", "邮件发送已达上限，请稍后重试。"),
  reqRate: t("요청이 너무 잦아요. 잠시 후 다시 시도해 주세요.", "Too many requests. Please try again in a moment.", "请求过于频繁，请稍后重试。"),
  session: t("로그인 세션이 만료되었어요. 다시 로그인해 주세요.", "Your session has expired. Please log in again.", "登录已过期，请重新登录。"),
  oauthState: t("소셜 로그인이 중단되었어요. 처음부터 다시 시도해 주세요.", "Social login was interrupted. Please start again.", "社交登录中断，请重新开始。"),
  flowExpired: t("로그인 요청이 만료되었어요. 처음부터 다시 시도해 주세요.", "The login request expired. Please start again.", "登录请求已过期，请重新开始。"),
  pwned: t("많이 쓰이거나 유출된 비밀번호예요. 다른 비밀번호를 사용해 주세요.", "That password is common or has been leaked. Please choose another.", "该密码过于常见或已泄露，请换一个。"),
  captcha: t("보안 확인에 실패했어요. 새로고침 후 다시 시도해 주세요.", "Security check failed. Refresh and try again.", "安全验证失败，请刷新后重试。"),
  network: t("네트워크 연결이 불안정해요. 잠시 후 다시 시도해 주세요.", "Network connection is unstable. Please try again shortly.", "网络连接不稳定，请稍后重试。"),
  db: t("처리 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.", "Something went wrong. Please try again shortly.", "处理时出现问题，请稍后重试。"),
  fallback: t("요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.", "We couldn't complete that request. Please try again shortly.", "请求处理失败，请稍后重试。"),
};

const BY_CODE: Record<string, L> = {
  invalid_credentials: M.invalidCredentials,
  email_not_confirmed: M.notConfirmed,
  user_already_exists: M.exists,
  email_exists: M.exists,
  user_not_found: M.notFound,
  weak_password: M.weak,
  same_password: M.same,
  otp_expired: t("링크가 만료되었어요. 다시 요청해 주세요.", "The link has expired. Please request a new one.", "链接已过期，请重新申请。"),
  validation_failed: M.validation,
  email_address_invalid: M.invalidEmail,
  signup_disabled: M.signupDisabled,
  provider_disabled: M.providerDisabled,
  over_email_send_rate_limit: M.emailRate,
  over_request_rate_limit: M.reqRate,
  session_expired: M.session,
  refresh_token_not_found: M.session,
  bad_oauth_state: M.oauthState,
  flow_state_expired: M.flowExpired,
};

const BY_MESSAGE: { test: RegExp; msg: L | ((m: RegExpMatchArray) => L) }[] = [
  { test: /invalid login credentials/i, msg: M.invalidCredentials },
  { test: /email not confirmed|email address not confirmed/i, msg: M.notConfirmed },
  { test: /user already registered|already been registered|user already exists/i, msg: M.exists },
  { test: /password should be at least (\d+)/i, msg: (m) => t(`비밀번호는 ${m[1]}자 이상이어야 합니다.`, `Password must be at least ${m[1]} characters.`, `密码至少需要 ${m[1]} 位。`) },
  { test: /new password should be different|different from the old password/i, msg: M.same },
  { test: /for security purposes.*?(\d+) seconds/i, msg: (m) => t(`보안을 위해 ${m[1]}초 후에 다시 시도할 수 있어요.`, `For security, you can try again in ${m[1]} seconds.`, `出于安全考虑，请在 ${m[1]} 秒后重试。`) },
  { test: /email rate limit exceeded|over_email_send_rate_limit/i, msg: M.emailRate },
  { test: /request rate limit|too many requests/i, msg: M.reqRate },
  { test: /token has expired or is invalid|email link is invalid or has expired|otp_expired/i, msg: M.expired },
  { test: /unable to validate email address|invalid format|email address .* is invalid/i, msg: M.invalidEmail },
  { test: /signups not allowed|signup is disabled/i, msg: M.signupDisabled },
  { test: /unsupported provider|provider is not enabled/i, msg: M.providerDisabled },
  { test: /user not found/i, msg: M.notFound },
  { test: /password is known to be weak|weak password|pwned/i, msg: M.pwned },
  { test: /invalid refresh token|refresh token not found|session.*expired|jwt expired/i, msg: M.session },
  { test: /captcha/i, msg: M.captcha },
  { test: /failed to fetch|network ?error|load failed|connection/i, msg: M.network },
  { test: /database error/i, msg: M.db },
];

/** 한국어(또는 이미 번역된) 문구인지 — 한글이 들어 있으면 그대로 보여준다 */
const isKorean = (s: string) => /[가-힣]/.test(s);

export function authErrorMessage(err: MaybeAuthError, fallback?: string, locale: Locale = "ko"): string {
  const fb = fallback ?? M.fallback[locale];
  if (!err) return fb;
  const code = typeof err === "string" ? undefined : err.code;
  const raw = (typeof err === "string" ? err : err.message ?? "").trim();

  // 구체적인 메시지 패턴이 code 보다 우선 (validation_failed·weak_password 처럼 code 가 뭉뚱그려지는 경우)
  for (const rule of BY_MESSAGE) {
    const m = raw.match(rule.test);
    if (m) return (typeof rule.msg === "function" ? rule.msg(m) : rule.msg)[locale];
  }
  if (code && BY_CODE[code]) return BY_CODE[code][locale];
  if (raw && isKorean(raw) && locale === "ko") return raw; // 우리가 만든 한국어 메시지는 그대로
  return fb;
}

/** 로그인 페이지 ?error= 로 넘길 수 있는 키 — 임의 문구가 URL 로 주입되는 것을 막는다 */
export const AUTH_ERROR_PARAM: Record<string, L> = {
  oauth: t("소셜 로그인에 실패했어요. 다시 시도해 주세요.", "Social login failed. Please try again.", "社交登录失败，请重试。"),
  oauth_cancelled: t("소셜 로그인이 취소되었어요.", "Social login was cancelled.", "社交登录已取消。"),
  oauth_disabled: M.providerDisabled,
  session: M.session,
};

export function authErrorFromParam(key: string | null | undefined, locale: Locale = "ko"): string | null {
  if (!key) return null;
  return (AUTH_ERROR_PARAM[key] ?? AUTH_ERROR_PARAM.oauth)[locale];
}
