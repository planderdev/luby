import type { Locale } from "./config";

/** 크리에이터 공개 프로필(/p/[id]) UI 문자열 */
const ko = {
  home: "루비AI 홈",
  dashboard: "대시보드",
  login: "로그인",
  badge: "루비AI 크리에이터",
  followersTotal: (n: string) => `팔로워 합 ${n}`,
  stats: (completed: number, selected: number) => `체험 완료 ${completed}건 · 선정 ${selected}회`,
  channels: "채널",
  noChannels: "등록된 채널이 없어요.",
  recent: "최근 협업",
  completedAt: (d: string) => `${d} 완료`,
  ctaInvite: "대시보드에서 초대하기",
  ctaSignup: "광고주로 가입하고 초대하기",
  ctaMine: "내 공개 프로필 설정",
  disclaimer: "이 프로필은 크리에이터 본인이 공개를 선택한 정보만 표시합니다. 루비AI — 글로벌 체험단 마케팅 플랫폼.",
  footerHome: "홈",
  terms: "이용약관",
  privacy: "개인정보처리방침",
  metaTitle: (name: string) => `${name} — 크리에이터 프로필`,
  metaDesc: (cats: string, ch: string, followers: string, completed: number, region: string) => `${cats || "크리에이터"} · ${ch || "채널"} · 팔로워 ${followers} · 체험 완료 ${completed}건${region}`,
  ogTitle: (name: string) => `${name} · 루비AI 크리에이터`,
  dateLocale: "ko-KR",
  brand: "루비AI",
};
export type PublicCreatorDict = typeof ko;
const en: PublicCreatorDict = {
  home: "Luby AI home", dashboard: "Dashboard", login: "Log in", badge: "Luby AI creator",
  followersTotal: (n) => `${n} followers total`,
  stats: (c, s) => `${c} completed · selected ${s}×`,
  channels: "Channels", noChannels: "No channels yet.", recent: "Recent collaborations",
  completedAt: (d) => `Completed ${d}`,
  ctaInvite: "Invite from dashboard", ctaSignup: "Sign up as advertiser & invite", ctaMine: "My public profile settings",
  disclaimer: "This profile shows only information the creator chose to make public. Luby AI — global creator campaign platform.",
  footerHome: "Home", terms: "Terms", privacy: "Privacy",
  metaTitle: (name) => `${name} — Creator profile`,
  metaDesc: (cats, ch, f, c, r) => `${cats || "Creator"} · ${ch || "channels"} · ${f} followers · ${c} completed${r}`,
  ogTitle: (name) => `${name} · Luby AI creator`,
  dateLocale: "en-US", brand: "Luby AI",
};
const zh: PublicCreatorDict = {
  home: "Luby AI 首页", dashboard: "控制台", login: "登录", badge: "Luby AI 创作者",
  followersTotal: (n) => `粉丝合计 ${n}`,
  stats: (c, s) => `完成体验 ${c} 次 · 入选 ${s} 次`,
  channels: "渠道", noChannels: "尚未登记渠道。", recent: "近期合作",
  completedAt: (d) => `${d} 完成`,
  ctaInvite: "在控制台邀请", ctaSignup: "注册为广告主并邀请", ctaMine: "我的公开资料设置",
  disclaimer: "本页面仅显示创作者本人选择公开的信息。Luby AI — 全球体验官营销平台。",
  footerHome: "首页", terms: "服务条款", privacy: "隐私政策",
  metaTitle: (name) => `${name} — 创作者资料`,
  metaDesc: (cats, ch, f, c, r) => `${cats || "创作者"} · ${ch || "渠道"} · 粉丝 ${f} · 完成体验 ${c} 次${r}`,
  ogTitle: (name) => `${name} · Luby AI 创作者`,
  dateLocale: "zh-CN", brand: "Luby AI",
};
export const publicCreatorDict: Record<Locale, PublicCreatorDict> = { ko, en, zh };
