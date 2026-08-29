/**
 * 이메일 도메인 오타 감지 — 가입 폼에서 "혹시 ○○ 아닌가요?" 힌트용.
 *
 * 2026-08-29 유입 급증 때 가입 63명 중 6명(~10%)이 gamil.com·qmail.com·naver.con 같은
 * 오타 주소로 가입해 인증 메일이 영영 닿지 못했다. 제출을 막지는 않고 제안만 한다.
 */

/** 한국 사용자 기준 주요 도메인 (빈도순) */
const KNOWN_DOMAINS = [
  "naver.com",
  "gmail.com",
  "hanmail.net",
  "daum.net",
  "kakao.com",
  "nate.com",
  "icloud.com",
  "outlook.com",
  "hotmail.com",
  "yahoo.com",
];

/** 자주 나오는 TLD 오타 → 교정 */
const TLD_FIXES: [RegExp, string][] = [
  [/\.con$/, ".com"],
  [/\.cmo$/, ".com"],
  [/\.vom$/, ".com"],
  [/\.comm$/, ".com"],
  [/\.co$/, ".com"], // gmail.co 등 — naver.co.kr 처럼 뒤가 더 있으면 아래 편집거리에서 걸러짐
  [/\.nte$/, ".net"],
  [/\.ent$/, ".net"],
];

/** 편집거리 — 인접 전위(gamil↔gmail)를 1로 세는 Damerau-Levenshtein(OSA). 순서 바꿈이 오타의 대부분이다 */
function editDistance(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return 3;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + 1);
      }
    }
  return dp[a.length][b.length];
}

/** 오타로 보이면 교정된 전체 주소를, 아니면 null 을 돌려준다 */
export function suggestEmail(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at < 1) return null;
  const local = email.slice(0, at);
  let domain = email.slice(at + 1).toLowerCase().trim();
  if (!domain || domain.length < 4) return null;
  if (KNOWN_DOMAINS.includes(domain)) return null;

  // 1) TLD 오타 교정 후 재확인
  for (const [pat, fix] of TLD_FIXES) {
    if (pat.test(domain)) {
      const fixed = domain.replace(pat, fix);
      if (KNOWN_DOMAINS.includes(fixed)) return `${local}@${fixed}`;
      domain = fixed; // .con → .com 만 고치고 아래 편집거리로 이어간다 (gamil.con 대응)
      break;
    }
  }

  // 2) 주요 도메인과 편집거리 1 (qmail→gmail 같은 한 글자 오타)
  for (const known of KNOWN_DOMAINS) {
    if (domain !== known && editDistance(domain, known) <= 1) return `${local}@${known}`;
  }
  return null;
}

/**
 * 도메인 자동완성 — "@g" 처럼 치기 시작하면 gmail.com 등 완성 후보를 돌려준다.
 * "@" 만 친 상태에서는 상위 도메인 5개를 제안한다. 이미 완성된 주소에는 아무것도 돌려주지 않는다.
 */
export function completeEmail(email: string, limit = 5): string[] {
  const at = email.lastIndexOf("@");
  if (at < 1) return [];
  const local = email.slice(0, at);
  const domain = email.slice(at + 1).toLowerCase().trim();
  return KNOWN_DOMAINS.filter((d) => d.startsWith(domain) && d !== domain)
    .slice(0, limit)
    .map((d) => `${local}@${d}`);
}
