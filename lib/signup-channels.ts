/**
 * 가입 경로(signup_source) → 채널 이름 분류.
 *
 * utm_source 가 있으면 그것을 우선하고(광고·공유 링크는 이게 정확), 없으면 referrer 도메인으로 판별한다.
 * 목록에 없는 값은 버리지 않고 도메인/utm 값 그대로 보여준다 — 새 채널이 생기면 집계에 자연히 드러난다.
 */

export type SignupSource = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  referrer?: string;
} | null;

type Rule = { label: string; utm: string[]; hosts: string[] };

/** 판별 순서 중요 — 네이버 블로그·카페를 네이버 검색보다 먼저 본다 */
const RULES: Rule[] = [
  { label: "구글 광고", utm: [], hosts: [] }, // 아래에서 google + cpc 조합으로 처리
  { label: "네이버 블로그", utm: ["naver_blog"], hosts: ["blog.naver.com", "m.blog.naver.com"] },
  { label: "네이버 카페", utm: ["naver_cafe"], hosts: ["cafe.naver.com", "m.cafe.naver.com"] },
  { label: "네이버", utm: ["naver"], hosts: ["naver.com", "search.naver.com", "m.naver.com", "m.search.naver.com"] },
  { label: "구글", utm: ["google"], hosts: ["google.com", "google.co.kr", "www.google.com"] },
  { label: "인스타그램", utm: ["instagram", "ig"], hosts: ["instagram.com", "l.instagram.com", "www.instagram.com"] },
  { label: "페이스북", utm: ["facebook", "fb", "meta"], hosts: ["facebook.com", "m.facebook.com", "l.facebook.com", "lm.facebook.com"] },
  { label: "당근", utm: ["daangn", "당근", "karrot"], hosts: ["daangn.com", "www.daangn.com", "karrotmarket.com"] },
  { label: "자사몰", utm: ["자사몰", "ownmall", "mall", "shop"], hosts: ["plander.io", "www.plander.io"] },
  { label: "카카오", utm: ["kakao", "kakaotalk"], hosts: ["kakao.com", "pf.kakao.com", "story.kakao.com", "open.kakao.com"] },
  { label: "유튜브", utm: ["youtube", "yt"], hosts: ["youtube.com", "www.youtube.com", "youtu.be", "m.youtube.com"] },
  { label: "틱톡", utm: ["tiktok"], hosts: ["tiktok.com", "www.tiktok.com", "vt.tiktok.com"] },
  { label: "스레드", utm: ["threads"], hosts: ["threads.net", "www.threads.net", "threads.com"] },
  { label: "X(트위터)", utm: ["x", "twitter"], hosts: ["x.com", "twitter.com", "t.co"] },
  { label: "샤오홍슈", utm: ["xiaohongshu", "xhs", "rednote"], hosts: ["xiaohongshu.com", "www.xiaohongshu.com", "xhslink.com"] },
  { label: "다음", utm: ["daum"], hosts: ["daum.net", "search.daum.net", "m.daum.net"] },
  { label: "티스토리", utm: ["tistory"], hosts: ["tistory.com"] },
  { label: "밴드", utm: ["band"], hosts: ["band.us"] },
  { label: "링크드인", utm: ["linkedin"], hosts: ["linkedin.com", "www.linkedin.com", "lnkd.in"] },
  {
    label: "커뮤니티",
    utm: ["community"],
    hosts: ["ppomppu.co.kr", "clien.net", "theqoo.net", "instiz.net", "fmkorea.com", "dcinside.com", "ruliweb.com", "82cook.com", "mlbpark.donga.com", "bobaedream.co.kr"],
  },
];

function hostOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

function hostMatches(host: string, candidates: string[]): boolean {
  return candidates.some((c) => {
    const cc = c.replace(/^www\./, "");
    return host === cc || host.endsWith(`.${cc}`);
  });
}

/** 채널 라벨 하나로 분류. null → "직접·미상" */
export function classifySignupChannel(src: SignupSource): string {
  if (!src || (!src.utm_source && !src.referrer)) return "직접·미상";

  const utm = src.utm_source?.trim().toLowerCase();
  const medium = src.utm_medium?.trim().toLowerCase() ?? "";

  if (utm) {
    // 구글 광고: source=google + 유료 매체
    if (utm === "google" && /^(cpc|ppc|paid|paid_search|ads)$/.test(medium)) return "구글 광고";
    for (const r of RULES) if (r.utm.includes(utm)) return r.label;
    return `utm:${src.utm_source!.slice(0, 40)}`; // 모르는 캠페인 값은 그대로 노출
  }

  const host = hostOf(src.referrer);
  if (!host) return "직접·미상";
  for (const r of RULES) if (r.hosts.length && hostMatches(host, r.hosts)) return r.label;
  return host.slice(0, 60); // 모르는 유입원은 도메인 그대로 — 새 채널이 집계에 저절로 드러난다
}
