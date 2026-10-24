/**
 * 채널 본인 인증 — 루비가 준 코드(LUBY-XXXXXX)를 채널 소개란에 잠시 넣어 계정 주인임을 보인다.
 * - YouTube(키 있음): 채널 설명을 API 로 읽어 자동 확인 + 구독자 수 자동 수집 → 신뢰 단계 'api'(자동 확인)
 * - 그 밖(인스타·틱톡·스레드·샤오홍슈·더우인·블로그·Lemon8): 코드와 팔로워가 보이는 프로필 캡처를 올리면 운영자가 확인 → 'operator'
 * 공개 페이지를 긁어 확인하지 않는다(플랫폼 약관·차단). 순수 함수만 — 클라이언트에서도 쓴다.
 */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 0·O·1·I 처럼 헷갈리는 글자 제외

export function generateVerifyCode(rand: (n: number) => Uint8Array = (n) => crypto.getRandomValues(new Uint8Array(n))): string {
  const bytes = rand(6);
  return `LUBY-${Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("")}`;
}

/** 소개란에 코드가 있는가 — 대소문자·공백·하이픈 차이는 무시(LUBY-AB12CD, luby ab12cd 모두 인정) */
export function codeInText(text: string | null | undefined, code: string): boolean {
  const norm = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return !!text && norm(text).includes(norm(code));
}

export type TrustLevel = "api" | "operator" | "self";

/** DB 의 verified·stats_source 로 화면에 보일 신뢰 단계 */
export function trustLevel(ch: { verified: boolean; stats_source?: string | null }): TrustLevel {
  if (!ch.verified) return "self";
  return ch.stats_source === "api" ? "api" : "operator";
}

/** 캡처 경로는 반드시 본인 폴더(업로드 정책과 같은 규칙) */
export function isOwnProofPath(path: string, userId: string): boolean {
  return path.startsWith(`${userId}/`) && !path.includes("..") && path.length < 300;
}
