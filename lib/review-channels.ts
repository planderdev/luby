/**
 * 결과 보고서의 리뷰 채널 — 링크 호스트로 채널을 알아내고, 엑셀의 '채널' 열 표기(인스타/小红书/IG…)를 같은 키로 맞춘다.
 * 보고서 화면·편집기·파서가 공유한다. 새 플랫폼은 여기만 추가.
 */
export type ReviewChannel =
  | "instagram" | "xiaohongshu" | "youtube" | "tiktok" | "naver_blog" | "naver_cafe" | "naver"
  | "threads" | "douyin" | "weibo" | "facebook" | "x" | "lemon8" | "tistory" | "brunch" | "kakao" | "other";

export const CHANNEL_LABEL: Record<ReviewChannel, string> = {
  instagram: "Instagram",
  xiaohongshu: "샤오홍슈 (小红书)",
  youtube: "YouTube",
  tiktok: "TikTok",
  naver_blog: "네이버 블로그",
  naver_cafe: "네이버 카페",
  naver: "네이버",
  threads: "Threads",
  douyin: "Douyin (抖音)",
  weibo: "Weibo (微博)",
  facebook: "Facebook",
  x: "X (Twitter)",
  lemon8: "Lemon8",
  tistory: "티스토리",
  brunch: "브런치",
  kakao: "카카오",
  other: "기타",
};

/** 화면 표시용 — 모르는 키는 그대로(호스트명 등), 빈 값은 '기타' */
export function channelLabel(ch: string | null | undefined): string {
  if (!ch) return CHANNEL_LABEL.other;
  return (CHANNEL_LABEL as Record<string, string>)[ch] ?? ch;
}

const HOST_RULES: [RegExp, ReviewChannel][] = [
  [/(^|\.)instagram\.com$/i, "instagram"],
  [/(^|\.)(xiaohongshu\.com|xhslink\.com|xhscdn\.com)$/i, "xiaohongshu"],
  [/(^|\.)(youtube\.com|youtu\.be)$/i, "youtube"],
  [/(^|\.)tiktok\.com$/i, "tiktok"],
  [/^(m\.)?blog\.naver\.com$/i, "naver_blog"],
  [/^(m\.)?cafe\.naver\.com$/i, "naver_cafe"],
  [/(^|\.)naver\.(com|me)$/i, "naver"],
  [/(^|\.)threads\.(net|com)$/i, "threads"],
  [/(^|\.)(douyin\.com|iesdouyin\.com)$/i, "douyin"],
  [/(^|\.)weibo\.(com|cn)$/i, "weibo"],
  [/(^|\.)(facebook\.com|fb\.com|fb\.watch)$/i, "facebook"],
  [/(^|\.)(x\.com|twitter\.com|t\.co)$/i, "x"],
  [/(^|\.)lemon8-app\.com$/i, "lemon8"],
  [/(^|\.)tistory\.com$/i, "tistory"],
  [/(^|\.)brunch\.co\.kr$/i, "brunch"],
  [/(^|\.)(kakao\.com|kakaocdn\.net|pf\.kakao\.com)$/i, "kakao"],
];

export function hostOf(url: string | null | undefined): string {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./i, "");
  } catch {
    return url.replace(/^https?:\/\//i, "").split("/")[0].replace(/^www\./i, "");
  }
}

/** 링크 호스트로 채널 판별. 모르면 'other' */
export function detectChannel(url: string | null | undefined): ReviewChannel {
  const host = hostOf(url);
  if (!host) return "other";
  for (const [re, ch] of HOST_RULES) if (re.test(host)) return ch;
  return "other";
}

const TEXT_RULES: [RegExp, ReviewChannel][] = [
  [/insta|인스타|ig\b|小红书|xhs|샤오홍슈|rednote|red\s*note/i, "instagram"], // 임시 — 아래에서 세분
];
void TEXT_RULES;

/** 엑셀 '채널' 열의 자유 표기를 키로. 못 알아들으면 null (링크로 판별) */
export function normalizeChannelText(text: string | null | undefined): ReviewChannel | null {
  const s = (text ?? "").trim().toLowerCase();
  if (!s) return null;
  if (/小红书|xiaohongshu|xhs|샤오홍슈|rednote|red\s*note/.test(s)) return "xiaohongshu";
  if (/insta|인스타|^ig$/.test(s)) return "instagram";
  if (/youtube|유튜브|쇼츠|shorts/.test(s)) return "youtube";
  if (/tiktok|틱톡|抖音|douyin/.test(s)) return /抖音|douyin/.test(s) ? "douyin" : "tiktok";
  if (/카페|cafe/.test(s)) return "naver_cafe";
  if (/블로그|blog|네이버|naver/.test(s)) return "naver_blog";
  if (/threads|스레드/.test(s)) return "threads";
  if (/weibo|微博|웨이보/.test(s)) return "weibo";
  if (/facebook|페이스북|^fb$/.test(s)) return "facebook";
  if (/twitter|트위터|^x$|엑스/.test(s)) return "x";
  if (/lemon8|레몬/.test(s)) return "lemon8";
  if (/tistory|티스토리/.test(s)) return "tistory";
  if (/brunch|브런치/.test(s)) return "brunch";
  if (/kakao|카카오/.test(s)) return "kakao";
  return null;
}

/** 프로필(계정) 주소처럼 보이면 true — 게시물 링크와 구분할 때 쓴다 */
export function isProfileUrl(url: string): boolean {
  let host = "";
  let path = "";
  try {
    const u = new URL(url);
    host = u.hostname.replace(/^www\./i, "");
    path = u.pathname.replace(/\/+$/, "");
  } catch {
    return false;
  }
  const segs = path.split("/").filter(Boolean);
  if (/instagram\.com$/i.test(host)) return segs.length === 1 && !["p", "reel", "reels", "explore", "stories"].includes(segs[0]);
  if (/youtube\.com$/i.test(host)) return segs.length >= 1 && (/^@/.test(segs[0]) || ["channel", "c", "user"].includes(segs[0])) && segs.length <= 2 && !["watch", "shorts"].includes(segs[0]);
  if (/tiktok\.com$/i.test(host)) return segs.length === 1 && /^@/.test(segs[0]);
  if (/xiaohongshu\.com$/i.test(host)) return segs[0] === "user" && segs[1] === "profile";
  if (/threads\.(net|com)$/i.test(host)) return segs.length === 1 && /^@/.test(segs[0]);
  if (/^(m\.)?blog\.naver\.com$/i.test(host)) return segs.length === 1;
  if (/(x\.com|twitter\.com)$/i.test(host)) return segs.length === 1;
  if (/douyin\.com$/i.test(host)) return segs[0] === "user";
  if (/weibo\.com$/i.test(host)) return segs[0] === "u" || segs.length === 1;
  return segs.length === 0;
}
