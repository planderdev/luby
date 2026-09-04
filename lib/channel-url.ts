/**
 * 가입 시 입력한 채널 URL/아이디 정규화.
 *
 * 2026-09-04 집계: 가입 때 URL 을 적은 33명은 97% 가 채널 등록됐고, 안 적은 66명은
 * 단 한 명도 나중에 등록하지 않았다(재방문 8명). "선택" 필드가 크리에이터의 2/3 를
 * 검수 불가 상태로 만들어서 필수로 바꿨다. 입력 부담을 줄이려고 @아이디만 적어도
 * 플랫폼별 프로필 URL 로 완성한다.
 */

/** 플랫폼 slug(channel_types.slug) → 아이디로 프로필 URL 을 만드는 규칙 */
const HANDLE_URL: Record<string, (h: string) => string> = {
  instagram: (h) => `https://instagram.com/${h}`,
  youtube: (h) => `https://youtube.com/@${h}`,
  tiktok: (h) => `https://tiktok.com/@${h}`,
  threads: (h) => `https://threads.net/@${h}`,
  blog: (h) => `https://blog.naver.com/${h}`,
  xiaohongshu: (h) => `https://xiaohongshu.com/user/profile/${h}`,
  douyin: (h) => `https://douyin.com/user/${h}`,
  lemon8: (h) => `https://lemon8-app.com/@${h}`,
};

/**
 * URL 이면 그대로(스킴 보정), "@아이디"/"아이디"면 플랫폼 프로필 URL 로.
 * 빈 값이나 만들 수 없는 값이면 null.
 */
export function normalizeChannelUrl(input: string, platformSlug: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  // "instagram.com/abc" 처럼 도메인부터 적은 경우 — 스킴만 붙인다
  if (/^[\w-]+(\.[\w-]+)+\//.test(raw) || /^[\w-]+\.[\w-]+$/.test(raw)) return `https://${raw}`;
  const handle = raw.replace(/^@/, "");
  if (!handle || /[\s/?#@]/.test(handle)) return null;
  const build = HANDLE_URL[platformSlug];
  return build ? build(handle) : null;
}
