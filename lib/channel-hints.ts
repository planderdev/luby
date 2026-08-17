/** 채널 종류(slug)별 URL 예시·핸들 안내·허용 도메인. 글로벌 채널(샤오홍슈·더우인·Lemon8) 포함 */
export const CHANNEL_HINTS: Record<
  string,
  { urlPlaceholder: string; handlePlaceholder: string; tip?: string; domains: string[] }
> = {
  instagram: { urlPlaceholder: "https://instagram.com/myhandle", handlePlaceholder: "@myhandle", domains: ["instagram.com"] },
  youtube: { urlPlaceholder: "https://youtube.com/@mychannel", handlePlaceholder: "@mychannel", domains: ["youtube.com", "youtu.be"] },
  tiktok: { urlPlaceholder: "https://tiktok.com/@myhandle", handlePlaceholder: "@myhandle", domains: ["tiktok.com"] },
  blog: { urlPlaceholder: "https://blog.naver.com/myid", handlePlaceholder: "myid", tip: "네이버·티스토리·브런치 등 블로그 주소", domains: ["blog.naver.com", "tistory.com", "brunch.co.kr", "velog.io", "medium.com", "naver.com"] },
  threads: { urlPlaceholder: "https://threads.net/@myhandle", handlePlaceholder: "@myhandle", domains: ["threads.net", "threads.com"] },
  xiaohongshu: {
    urlPlaceholder: "https://www.xiaohongshu.com/user/profile/5f…",
    handlePlaceholder: "小红书号 (예: 123456789)",
    tip: "앱 → 프로필 → '小红书号'가 핸들이에요. URL은 프로필 공유 링크를 붙여넣으세요 (xhslink.com 단축 링크도 가능)",
    domains: ["xiaohongshu.com", "xhslink.com"],
  },
  douyin: {
    urlPlaceholder: "https://www.douyin.com/user/MS4wLjAB…",
    handlePlaceholder: "抖音号 (예: dy_abc123)",
    tip: "앱 → 프로필 → '抖音号'가 핸들이에요. v.douyin.com 공유 링크도 가능",
    domains: ["douyin.com"],
  },
  lemon8: {
    urlPlaceholder: "https://www.lemon8-app.com/@myhandle",
    handlePlaceholder: "@myhandle",
    domains: ["lemon8-app.com"],
  },
};

export function channelHint(slug: string | undefined) {
  return (slug && CHANNEL_HINTS[slug]) || { urlPlaceholder: "https://…", handlePlaceholder: "@myhandle", domains: [] as string[] };
}

/** URL 호스트가 채널 종류의 허용 도메인과 맞는지 (허용 목록이 비어 있으면 통과) */
export function urlMatchesChannel(url: string, slug: string | undefined): boolean {
  const h = channelHint(slug);
  if (h.domains.length === 0) return true;
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    return h.domains.some((d) => host === d || host.endsWith("." + d));
  } catch {
    return false;
  }
}
