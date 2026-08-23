/** 가이드 사이트 UI 문자열 (콘텐츠는 docs/manuals/{lang}/) */
export type DocsLocale = "ko" | "en" | "zh";
export const DOCS_LOCALES: DocsLocale[] = ["ko", "en", "zh"];
export const docsPrefix = (l: DocsLocale) => (l === "ko" ? "/docs" : `/docs/${l}`);

const ko = {
  siteTitle: "루비AI 가이드", badge: "가이드", search: "검색…", searchPlaceholder: "기능·화면 이름으로 검색 (예: 출금, QR 포스터, 검수)", noResults: "결과가 없어요. 다른 단어로 찾아보세요.",
  openDashboard: "대시보드 열기", login: "로그인", home: "가이드 홈", toc: "목차", tocOpen: "목차 열기", close: "닫기",
  breadcrumb: "가이드", copyMd: "Markdown 복사", copied: "복사됨", prev: "이전", next: "다음", updated: "마지막 업데이트", onThisPage: "이 페이지에서",
  homeTitle: "루비AI 가이드", homeSub: "광고주·크리에이터·대행사가 루비AI를 쓰는 데 필요한 모든 안내를 한곳에 모았어요.",
  ctaStart: "무료로 시작하기", ctaDash: "대시보드 바로가기", ctaCreators: "크리에이터 안내 페이지", quickStart: "Quick Start", byRole: "역할별 가이드", docsCount: (n: number) => `${n}개 문서`,
  fbQ: "이 문서가 도움이 됐나요?", fbYes: "네", fbNo: "아니요", fbPlaceholder: "무엇이 부족했나요? (선택, 500자)", fbCancel: "취소", fbSend: "보내기", fbThanks: "의견 감사합니다. 더 나은 가이드를 만드는 데 쓸게요.", fbError: "전송에 실패했어요. 잠시 후 다시 시도해 주세요.",
  groups: { start: "시작하기", advertiser: "광고주 가이드", creator: "크리에이터 가이드", agency: "대행사 가이드", operator: "운영자 가이드" } as Record<string, string>,
  groupDesc: { start: "루비AI 소개, 역할별 바로가기, 요금제", advertiser: "가입부터 캠페인 만들기·모집·선정·검수·성과·결제까지", creator: "채널 등록, 응모, 체험·콘텐츠, 포인트 정산, 공개 프로필", agency: "클라이언트별 운영, 소싱, 보고", operator: "회원·캠페인 검수·정산·통계·자동화" } as Record<string, string>,
  quick: [
    { title: "광고주: 첫 캠페인 만들기 (AI에게 전부 맡기기)", href: "/advertiser/2" },
    { title: "크리에이터: 가입과 채널 승인", href: "/creator/1" },
    { title: "모집 늘리기 — 공유 링크·QR 포스터·AI 매칭", href: "/advertiser/3" },
    { title: "포인트와 출금", href: "/creator/6" },
  ],
  onlyKo: "이 언어로는 일부 가이드만 제공돼요. 전체 문서는 한국어 가이드에서 볼 수 있어요.",
};
export type DocsDict = typeof ko;

const en: DocsDict = {
  siteTitle: "Luby AI Guide", badge: "Guide", search: "Search…", searchPlaceholder: "Search by feature or screen (e.g. payout, QR poster)", noResults: "No results. Try another word.",
  openDashboard: "Open dashboard", login: "Log in", home: "Guide home", toc: "Contents", tocOpen: "Open contents", close: "Close",
  breadcrumb: "Guide", copyMd: "Copy Markdown", copied: "Copied", prev: "Previous", next: "Next", updated: "Last updated", onThisPage: "On this page",
  homeTitle: "Luby AI Guide", homeSub: "Everything creators and brands need to use Luby AI, in one place.",
  ctaStart: "Start for free", ctaDash: "Go to dashboard", ctaCreators: "Creator info page", quickStart: "Quick Start", byRole: "Guides by role", docsCount: (n) => `${n} pages`,
  fbQ: "Was this page helpful?", fbYes: "Yes", fbNo: "No", fbPlaceholder: "What was missing? (optional, 500 chars)", fbCancel: "Cancel", fbSend: "Send", fbThanks: "Thanks for your feedback — it helps us improve the guide.", fbError: "Couldn't send. Please try again later.",
  groups: { start: "Getting started", advertiser: "Advertiser guide", creator: "Creator guide", agency: "Agency guide", operator: "Operator guide" },
  groupDesc: { start: "What Luby AI is, shortcuts by role, pricing", advertiser: "From signup to campaigns, recruiting, selection, review, results and billing", creator: "Channels, applying, experience & content, points payout, public profile", agency: "Per-client operations, sourcing, reporting", operator: "Members, campaign review, payouts, stats, automation" },
  quick: [
    { title: "Advertisers: create your first campaign (let AI do it all)", href: "/advertiser/2" },
    { title: "Creators: sign up and channel approval", href: "/creator/1" },
    { title: "Grow applications — share link, QR poster, AI matching", href: "/advertiser/3" },
    { title: "Points and payout", href: "/creator/6" },
  ],
  onlyKo: "Only part of the guide is available in this language. The full documentation is available in Korean.",
};

const zh: DocsDict = {
  siteTitle: "Luby AI 使用指南", badge: "指南", search: "搜索…", searchPlaceholder: "按功能或页面名称搜索（如：提现、二维码海报）", noResults: "没有结果，换个词试试。",
  openDashboard: "打开控制台", login: "登录", home: "指南首页", toc: "目录", tocOpen: "打开目录", close: "关闭",
  breadcrumb: "指南", copyMd: "复制 Markdown", copied: "已复制", prev: "上一页", next: "下一页", updated: "最后更新", onThisPage: "本页内容",
  homeTitle: "Luby AI 使用指南", homeSub: "创作者与品牌使用 Luby AI 所需的全部说明，一站汇总。",
  ctaStart: "免费开始", ctaDash: "前往控制台", ctaCreators: "创作者介绍页", quickStart: "快速开始", byRole: "按角色查看", docsCount: (n) => `${n} 篇`,
  fbQ: "这篇文档有帮助吗？", fbYes: "有", fbNo: "没有", fbPlaceholder: "缺少了什么？（选填，500 字）", fbCancel: "取消", fbSend: "发送", fbThanks: "感谢反馈，我们会用来改进指南。", fbError: "发送失败，请稍后再试。",
  groups: { start: "快速入门", advertiser: "广告主指南", creator: "创作者指南", agency: "代理机构指南", operator: "运营指南" },
  groupDesc: { start: "Luby AI 介绍、按角色快速入口、价格", advertiser: "从注册到活动创建、招募、选拔、审核、效果与付费", creator: "频道登记、报名、体验与内容、积分提现、公开主页", agency: "按客户运营、资源对接、报告", operator: "会员、活动审核、结算、统计、自动化" },
  quick: [
    { title: "广告主：创建第一个活动（全部交给 AI）", href: "/advertiser/2" },
    { title: "创作者：注册与频道审核", href: "/creator/1" },
    { title: "扩大招募 — 分享链接、二维码海报、AI 匹配", href: "/advertiser/3" },
    { title: "积分与提现", href: "/creator/6" },
  ],
  onlyKo: "该语言仅提供部分指南，完整文档请查看韩文版。",
};

export const docsDict: Record<DocsLocale, DocsDict> = { ko, en, zh };
