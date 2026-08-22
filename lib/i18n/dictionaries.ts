import type { Locale } from "./config";

/**
 * Korean dictionary is the source of truth. `Dict` is inferred from it,
 * and the `en` / `zh` dictionaries are checked against that shape.
 */
const ko = {
  meta: {
    brand: "루비AI",
    title: "루비AI — 글로벌 체험단 마케팅 플랫폼",
    description:
      "루비AI는 글로벌 인플루언서·체험단을 AI로 매칭하는 마케팅 플랫폼입니다. 캠페인 등록부터 선정·콘텐츠 발행까지 한 곳에서.",
    ogLocale: "ko_KR",
    ogImageAlt: "루비AI — 글로벌 체험단 마케팅 플랫폼",
  },
  audience: ["광고주", "인플루언서", "마케팅 담당자"],
  nav: {
    home: "루비AI 홈",
    menu: [
      { label: "캠페인", href: "/c" },
      { label: "크리에이터", href: "/creators" },
      { label: "AI 기능", href: "#ai" },
      { label: "서비스", href: "#features" },
      { label: "작동 방식", href: "#how" },
      { label: "글로벌", href: "#global" },
      { label: "요금제", href: "#pricing" },
      { label: "FAQ", href: "#faq" },
    ],
    login: "로그인",
    cta: "무료로 시작하기",
    ctaShort: "시작하기",
  },
  hero: {
    eyebrow: "GLOBAL CAMPAIGN PLATFORM · 12개국 운영중",
    headlineLine1: "전 세계 체험단을,",
    headlineHighlight: "한 번의 캠페인",
    headlineSuffix: "으로.",
    sub1: "루비AI는 글로벌 인플루언서·체험단을 AI로 매칭하는 마케팅 플랫폼입니다.",
    sub2: "캠페인 등록부터 선정·콘텐츠 발행까지, 한 곳에서 끝냅니다.",
    ctaPrimary: "광고주로 시작하기",
    ctaSecondary: "인플루언서 등록하기",
    card: {
      title: "글로벌 뷰티 체험단 모집",
      id: "캠페인 ID · #RUBY-2418",
      status: "모집중",
      stats: [
        { label: "응모자", value: "248명" },
        { label: "선정 예정", value: "20명" },
        { label: "마감", value: "D-3" },
      ],
      tags: ["뷰티", "스킨케어", "K-Beauty", "Instagram", "TikTok"],
      matchScore: "매칭 점수",
    },
  },
  socialProof: {
    stats: [
      { value: "12개국", label: "활성 마켓" },
      { value: "8,500+", label: "등록 인플루언서" },
      { value: "1,200+", label: "진행 캠페인" },
      { value: "24h", label: "평균 응답" },
    ],
  },
  features: {
    label: "핵심 기능",
    heading1: "캠페인의 처음과 끝을,",
    heading2: "하나의 워크스페이스에서.",
    cards: [
      {
        title: "AI 매칭 엔진",
        desc: "캠페인 카테고리·예산·타겟 국가에 맞춰 가장 어울리는 인플루언서를 자동으로 추천합니다.",
      },
      {
        title: "5단계 캠페인 빌더",
        desc: "기본정보 → 홍보유형·채널 → 일정 → 미션·키워드 → 제공내역. 평균 7분 안에 캠페인을 오픈합니다.",
      },
      {
        title: "글로벌 인플루언서 풀",
        desc: "한국·일본·동남아·미주의 인스타·유튜브·틱톡·블로그 채널을 단일 풀에서 관리합니다.",
      },
      {
        title: "응모·선정 워크플로",
        desc: "응모자 프로필을 카드 형태로 한눈에 비교하고, 한 번의 클릭으로 선정/미선정을 처리합니다.",
      },
      {
        title: "역할별 대시보드",
        desc: "광고주·인플루언서·운영자가 각자의 KPI에 집중할 수 있도록 분리된 화면을 제공합니다.",
      },
      {
        title: "운영자 검수 시스템",
        desc: "가짜 계정·부적합 콘텐츠를 사전 차단하는 다단계 승인 프로세스를 갖추었습니다.",
      },
    ],
    visuals: {
      matchTags: ["뷰티", "패션", "F&B", "테크"],
      shieldTitle: "3단계 검증 통과",
      shieldSub: "계정 · 콘텐츠 · 약관",
      shieldStatus: "승인 완료",
    },
  },
  howItWorks: {
    label: "작동 방식",
    heading1: "광고주와 인플루언서를,",
    heading2: "정확히 한 번에 연결합니다.",
    advertiser: {
      badge: "FOR BRANDS",
      title: "광고주",
      desc: "제품을 알리고 싶은 브랜드라면",
      cta: "광고주로 시작하기",
      steps: [
        { title: "캠페인 등록", desc: "5단계 빌더로 평균 7분 안에 오픈" },
        { title: "응모자 검토", desc: "AI 매칭 점수와 함께 한눈에 비교" },
        { title: "체험단 선정", desc: "원클릭 선정 / 미선정 처리" },
        { title: "콘텐츠 수령", desc: "발행 확인 후 자동 정산" },
      ],
    },
    creator: {
      badge: "FOR CREATORS",
      title: "인플루언서",
      desc: "체험을 즐기는 크리에이터라면",
      cta: "크리에이터로 지원하기",
      steps: [
        { title: "SNS 채널 등록", desc: "인스타·유튜브·틱톡·블로그" },
        { title: "캠페인 둘러보기", desc: "내 카테고리에 맞춰 자동 추천" },
        { title: "응모 & 대기", desc: "선정 결과 평균 24시간 이내" },
        { title: "콘텐츠 발행", desc: "체험 후 발행 → 포인트 적립" },
      ],
    },
  },
  global: {
    label: "글로벌",
    headingLine1: "국내에서 시작해,",
    headingHighlight: "12개 마켓",
    headingSuffix: "으로.",
    paragraph:
      "다국어 캠페인 페이지·현지 결제·환율 자동 변환까지. 글로벌 확장은 옵션이 아니라 루비AI의 기본값입니다.",
    bullets: [
      "8개 언어 자동 번역 (KO/EN/JA/CN/TH/VI/ID/MS)",
      "현지 통화 결제 & 자동 정산",
      "지역별 인플루언서 등급 / 검증 시스템",
      "캠페인 단위 글로벌 ↔ 로컬 전환",
    ],
    channelsLabel: "채널",
    totalLabel: "총 누적 채널",
    newMarketLabel: "2026년 신규 마켓",
  },
  pricing: {
    label: "요금제",
    heading1: "규모에 따라,",
    heading2: "유연하게 시작하세요.",
    footnote: "모든 플랜은 부가세(VAT) 별도. 결제 후 7일 이내 100% 환불.",
    recommendedBadge: "추천",
    plans: [
      {
        period: "첫 캠페인",
        desc: "처음 시작하는 브랜드를 위한 무료 플랜",
        features: [
          "캠페인 1건 무료 등록",
          "응모자 10명까지 열람",
          "기본 통계 대시보드",
          "이메일 지원",
        ],
        cta: "무료로 시작",
      },
      {
        period: "월",
        desc: "성장 단계의 브랜드를 위한 표준 플랜",
        features: [
          "캠페인 무제한 등록",
          "AI 매칭 풀패키지",
          "고급 대시보드 · 우선 노출",
          "응모자 무제한 열람",
          "전용 채팅 지원",
        ],
        cta: "바로 시작하기",
      },
      {
        period: "맞춤",
        desc: "글로벌 멀티 브랜드를 위한 전담 플랜",
        features: [
          "전담 매니저 배정",
          "API · SSO 연동",
          "글로벌 멀티 브랜드 운영",
          "커스텀 SLA",
          "법무·세무 컨설팅",
        ],
        cta: "상담 문의",
      },
    ],
  },
  faq: {
    heading: "자주 묻는 질문",
    paragraph:
      "궁금한 점이 더 있으신가요? 디스코드 커뮤니티에서 루비AI 팀과 다른 마케터들에게 직접 답을 받을 수 있습니다.",
    communityTitle: "5,000+ 마케터",
    communitySub: "이미 함께하는 커뮤니티",
    items: [
      {
        q: "루비AI는 어떤 회사에 적합한가요?",
        a: "체험단·인플루언서 마케팅을 운영하는 모든 브랜드에 적합합니다. D2C 뷰티/F&B/패션 브랜드부터 글로벌 진출을 준비하는 스타트업까지, 캠페인 규모에 관계없이 사용할 수 있습니다.",
      },
      {
        q: "인플루언서는 어떻게 검증되나요?",
        a: "SNS 계정 인증, 실제 활동 이력 확인, 운영자 수동 승인의 3단계 검증을 거칩니다. 부적합 계정은 자동 필터링되며, 부정 활동 적발 시 즉시 풀에서 제외됩니다.",
      },
      {
        q: "글로벌 캠페인 시 결제 통화는 어떻게 되나요?",
        a: "광고주는 자국 통화로 결제하고, 인플루언서는 활동 국가 통화로 정산받습니다. 환율은 정산 시점 기준으로 자동 변환되며, 수수료는 BUSINESS 플랜 이상 무료입니다.",
      },
      {
        q: "무료 플랜으로도 캠페인을 운영할 수 있나요?",
        a: "네. FREE 플랜으로 1건의 캠페인을 무료로 등록하고 응모자 10명까지 열람할 수 있습니다. 캠페인 운영에 충분한 핵심 기능을 모두 사용할 수 있습니다.",
      },
      {
        q: "콘텐츠 저작권은 누구에게 있나요?",
        a: "기본적으로 인플루언서가 저작권을 보유합니다. 광고주는 캠페인 등록 시 사용 권한 범위(2차 활용·기간·매체)를 설정할 수 있으며, 양측의 동의 후 합의가 성립됩니다.",
      },
      {
        q: "정산 주기는 어떻게 되나요?",
        a: "콘텐츠 발행 확인 후 영업일 기준 7일 이내 자동 정산됩니다. ENTERPRISE 플랜은 매주 또는 격주 정산 주기를 선택할 수 있습니다.",
      },
      {
        q: "샤오홍슈(小红书) 같은 해외 플랫폼 체험단도 가능한가요?",
        a: "네. 크리에이터는 인스타그램·유튜브·틱톡·블로그·스레드 외에 샤오홍슈(小红书)·더우인(抖音)·Lemon8을 채널로 등록할 수 있고, 광고주는 캠페인에서 원하는 채널을 지정해 모집합니다. 중국·화교권 관광객이 한국 여행·맛집·쇼핑을 샤오홍슈에서 미리 찾아보기 때문에, 방문형 매장과 K뷰티·K푸드 브랜드에 특히 효과적입니다.",
      },
    ],
  },
  cta: {
    badge: "지금 가입하면 첫 캠페인 무료",
    headingLine1: "오늘 등록하면,",
    headingLine2Pre: "첫 캠페인은 ",
    headingHighlight: "무료",
    headingLine2Post: "입니다.",
    sub: "신용카드 등록 없이 5분 만에 시작하세요. 글로벌 인플루언서 풀이 곧바로 열립니다.",
    ctaPrimary: "무료로 시작하기",
    login: "로그인",
  },
  footer: {
    tagline1: "글로벌 체험단을 AI로 매칭하는 마케팅 플랫폼.",
    tagline2: "한국에서 시작해, 12개 마켓으로.",
    columns: [
      {
        title: "제품",
        links: [
          { label: "모집중 캠페인", href: "/c" },
          { label: "크리에이터로 시작하기", href: "/creators" },
          { label: "기능 소개", href: "#features" },
          { label: "AI 기능", href: "#ai" },
          { label: "요금제", href: "#pricing" },
          { label: "글로벌 마켓", href: "#global" },
        ],
      },
      {
        title: "회사",
        links: [
          { label: "활용 사례", href: "#use-cases" },
          { label: "신뢰·보안", href: "#trust" },
          { label: "작동 방식", href: "#how" },
          { label: "문의하기", href: "mailto:contact@plander.io" },
        ],
      },
      {
        title: "리소스",
        links: [
          { label: "사용 가이드", href: "/docs" },
          { label: "자주 묻는 질문", href: "#faq" },
          { label: "요금 안내", href: "#pricing" },
          { label: "고객 지원", href: "mailto:contact@plander.io" },
          { label: "로그인", href: "/login" },
        ],
      },
      {
        title: "법률",
        links: [
          { label: "이용약관", href: "/terms" },
          { label: "개인정보처리방침", href: "/privacy" },
          { label: "광고주 약관", href: "/terms#advertiser" },
          { label: "인플루언서 약관", href: "/terms#creator" },
        ],
      },
    ],
    copyright: "© 2026 루비AI. All rights reserved.",
    madeWith: "Made with care in Seoul · Jeju · Shanghai · Bangkok · Newyork",
  },
  comingSoon: {
    title: "베타테스트 완료",
    body1: "서비스 오픈 준비중입니다.",
    body2: "곧 정식 오픈 소식으로 다시 만나요.",
    emailPrefix: "💌 정식 오픈 알림을 받고 싶다면 ",
    emailSuffix: "로 메일 주세요.",
    confirm: "확인",
    close: "닫기",
  },
};

export type Dict = typeof ko;

const en: Dict = {
  meta: {
    brand: "Luby AI",
    title: "Luby AI — Global creator marketing platform",
    description:
      "Luby AI is a marketing platform that AI-matches global influencers and reviewers. From campaign setup to selection and content delivery, all in one place.",
    ogLocale: "en_US",
    ogImageAlt: "Luby AI — Global creator marketing platform",
  },
  audience: ["Advertisers", "Creators", "Marketers"],
  nav: {
    home: "Luby AI home",
    menu: [
      { label: "Campaigns", href: "/en/c" },
      { label: "Creators", href: "/en/creators" },
      { label: "AI", href: "#ai" },
      { label: "Product", href: "#features" },
      { label: "How it works", href: "#how" },
      { label: "Global", href: "#global" },
      { label: "Pricing", href: "#pricing" },
      { label: "FAQ", href: "#faq" },
    ],
    login: "Log in",
    cta: "Start for free",
    ctaShort: "Start",
  },
  hero: {
    eyebrow: "GLOBAL CAMPAIGN PLATFORM · LIVE IN 12 COUNTRIES",
    headlineLine1: "Reach creators worldwide",
    headlineHighlight: "in one campaign",
    headlineSuffix: ".",
    sub1: "Luby AI is a marketing platform that AI-matches global influencers and reviewers.",
    sub2: "From campaign setup to selection and content delivery — finish it all in one place.",
    ctaPrimary: "Start as an advertiser",
    ctaSecondary: "Sign up as a creator",
    card: {
      title: "Global beauty reviewer recruitment",
      id: "Campaign ID · #RUBY-2418",
      status: "Recruiting",
      stats: [
        { label: "Applicants", value: "248" },
        { label: "To select", value: "20" },
        { label: "Closes", value: "D-3" },
      ],
      tags: ["Beauty", "Skincare", "K-Beauty", "Instagram", "TikTok"],
      matchScore: "Match score",
    },
  },
  socialProof: {
    stats: [
      { value: "12", label: "Active markets" },
      { value: "8,500+", label: "Registered creators" },
      { value: "1,200+", label: "Live campaigns" },
      { value: "24h", label: "Avg. response" },
    ],
  },
  features: {
    label: "Features",
    heading1: "From first brief to final post,",
    heading2: "all in one workspace.",
    cards: [
      {
        title: "AI matching engine",
        desc: "Automatically recommends the best-fit creators for your campaign's category, budget, and target countries.",
      },
      {
        title: "5-step campaign builder",
        desc: "Basics → promotion type & channels → schedule → mission & keywords → offerings. Open a campaign in about 7 minutes.",
      },
      {
        title: "Global creator pool",
        desc: "Manage Instagram, YouTube, TikTok, and blog channels across Korea, Japan, Southeast Asia, and the Americas in one pool.",
      },
      {
        title: "Apply & select workflow",
        desc: "Compare applicant profiles at a glance as cards, and approve or decline with a single click.",
      },
      {
        title: "Role-based dashboards",
        desc: "Separate views so advertisers, creators, and operators can each focus on their own KPIs.",
      },
      {
        title: "Operator review system",
        desc: "A multi-step approval process that blocks fake accounts and unsuitable content in advance.",
      },
    ],
    visuals: {
      matchTags: ["Beauty", "Fashion", "F&B", "Tech"],
      shieldTitle: "Passed 3-step check",
      shieldSub: "Account · Content · Terms",
      shieldStatus: "Approved",
    },
  },
  howItWorks: {
    label: "How it works",
    heading1: "Brands and creators,",
    heading2: "matched precisely, in one step.",
    advertiser: {
      badge: "FOR BRANDS",
      title: "Advertisers",
      desc: "For brands that want to get noticed",
      cta: "Start as an advertiser",
      steps: [
        { title: "Create a campaign", desc: "Open in ~7 min with the 5-step builder" },
        { title: "Review applicants", desc: "Compare at a glance with AI match scores" },
        { title: "Select reviewers", desc: "One-click select / decline" },
        { title: "Receive content", desc: "Auto-settlement after posting is confirmed" },
      ],
    },
    creator: {
      badge: "FOR CREATORS",
      title: "Creators",
      desc: "For creators who love to try things",
      cta: "Apply as a creator",
      steps: [
        { title: "Connect SNS channels", desc: "Instagram · YouTube · TikTok · Blog" },
        { title: "Browse campaigns", desc: "Auto-recommended for your categories" },
        { title: "Apply & wait", desc: "Results within 24 hours on average" },
        { title: "Publish content", desc: "Post after the experience → earn points" },
      ],
    },
  },
  global: {
    label: "Global",
    headingLine1: "Start at home,",
    headingHighlight: "scale to 12 markets",
    headingSuffix: ".",
    paragraph:
      "Multilingual campaign pages, local payments, automatic currency conversion. Going global isn't an option — it's the Luby AI default.",
    bullets: [
      "Auto-translation in 8 languages (KO/EN/JA/CN/TH/VI/ID/MS)",
      "Local-currency payment & auto-settlement",
      "Per-region creator tiers / verification system",
      "Global ↔ local switch per campaign",
    ],
    channelsLabel: "channels",
    totalLabel: "Total channels",
    newMarketLabel: "New markets in 2026",
  },
  pricing: {
    label: "Pricing",
    heading1: "Flexible plans,",
    heading2: "that scale with you.",
    footnote: "All plans exclude VAT. 100% refund within 7 days of payment.",
    recommendedBadge: "Popular",
    plans: [
      {
        period: "first campaign",
        desc: "A free plan for brands just starting out",
        features: [
          "1 free campaign",
          "View up to 10 applicants",
          "Basic analytics dashboard",
          "Email support",
        ],
        cta: "Start free",
      },
      {
        period: "month",
        desc: "A standard plan for growing brands",
        features: [
          "Unlimited campaigns",
          "Full AI matching package",
          "Advanced dashboard · priority placement",
          "Unlimited applicant views",
          "Dedicated chat support",
        ],
        cta: "Get started",
      },
      {
        period: "custom",
        desc: "A dedicated plan for global multi-brand teams",
        features: [
          "Dedicated account manager",
          "API · SSO integration",
          "Global multi-brand operations",
          "Custom SLA",
          "Legal & tax consulting",
        ],
        cta: "Contact sales",
      },
    ],
  },
  faq: {
    heading: "Frequently asked questions",
    paragraph:
      "Still have questions? Get answers straight from the Luby AI team and other marketers in our Discord community.",
    communityTitle: "5,000+ marketers",
    communitySub: "Already in the community",
    items: [
      {
        q: "What kind of companies is Luby AI for?",
        a: "It fits any brand running reviewer or influencer marketing — from D2C beauty, F&B, and fashion brands to startups preparing to go global, regardless of campaign size.",
      },
      {
        q: "How are creators verified?",
        a: "They go through a 3-step check: SNS account verification, a review of real activity history, and manual operator approval. Unsuitable accounts are auto-filtered, and any fraudulent activity results in immediate removal from the pool.",
      },
      {
        q: "Which currency is used for global campaigns?",
        a: "Advertisers pay in their home currency, and creators are paid in their country's currency. Exchange rates are converted automatically at settlement time, and the fee is free on BUSINESS plans and above.",
      },
      {
        q: "Can I run a campaign on the free plan?",
        a: "Yes. The FREE plan lets you create one campaign and view up to 10 applicants. You get all the core features you need to run a campaign.",
      },
      {
        q: "Who owns the content copyright?",
        a: "By default the creator holds the copyright. When creating a campaign, advertisers can set the scope of usage rights (secondary use, duration, media), and the agreement takes effect once both sides consent.",
      },
      {
        q: "What is the settlement cycle?",
        a: "Settlement is automatic within 7 business days after posting is confirmed. ENTERPRISE plans can choose a weekly or biweekly settlement cycle.",
      },
      {
        q: "Can I run campaigns on overseas platforms like Xiaohongshu (RedNote)?",
        a: "Yes. Besides Instagram, YouTube, TikTok, blogs and Threads, creators can register Xiaohongshu (小红书), Douyin (抖音) and Lemon8 as channels, and advertisers pick the channels they want when creating a campaign. Because travelers from China and Chinese-speaking markets plan Korea trips, restaurants and shopping on Xiaohongshu first, it works especially well for visit-based stores and K-beauty / K-food brands.",
      },
    ],
  },
  cta: {
    badge: "Sign up now — first campaign free",
    headingLine1: "Sign up today,",
    headingLine2Pre: "and your first campaign is ",
    headingHighlight: "free",
    headingLine2Post: ".",
    sub: "Start in 5 minutes — no credit card required. The global creator pool opens right away.",
    ctaPrimary: "Start for free",
    login: "Log in",
  },
  footer: {
    tagline1: "The marketing platform that AI-matches global reviewers.",
    tagline2: "Started in Korea, now in 12 markets.",
    columns: [
      {
        title: "Product",
        links: [
          { label: "Open campaigns", href: "/en/c" },
          { label: "Become a creator", href: "/en/creators" },
          { label: "Features", href: "#features" },
          { label: "AI", href: "#ai" },
          { label: "Pricing", href: "#pricing" },
          { label: "Global markets", href: "#global" },
        ],
      },
      {
        title: "Company",
        links: [
          { label: "Use cases", href: "#use-cases" },
          { label: "Trust & security", href: "#trust" },
          { label: "How it works", href: "#how" },
          { label: "Contact", href: "mailto:contact@plander.io" },
        ],
      },
      {
        title: "Resources",
        links: [
          { label: "User guide (KR)", href: "/docs" },
          { label: "FAQ", href: "#faq" },
          { label: "Pricing", href: "#pricing" },
          { label: "Support", href: "mailto:contact@plander.io" },
          { label: "Log in", href: "/login" },
        ],
      },
      {
        title: "Legal",
        links: [
          { label: "Terms of service", href: "/terms?lang=en" },
          { label: "Privacy policy", href: "/privacy?lang=en" },
          { label: "Advertiser terms", href: "/terms?lang=en#advertiser" },
          { label: "Creator terms", href: "/terms?lang=en#creator" },
        ],
      },
    ],
    copyright: "© 2026 Luby AI. All rights reserved.",
    madeWith: "Made with care in Seoul · Jeju · Shanghai · Bangkok · Newyork",
  },
  comingSoon: {
    title: "Beta test complete",
    body1: "We're getting ready to launch.",
    body2: "See you soon with the official release.",
    emailPrefix: "💌 Want launch updates? Email us at ",
    emailSuffix: ".",
    confirm: "OK",
    close: "Close",
  },
};

const zh: Dict = {
  meta: {
    brand: "Luby AI",
    title: "Luby AI — 全球达人营销平台",
    description:
      "Luby AI 是用 AI 匹配全球网红与体验官的营销平台。从活动创建到甄选、内容发布，一站式完成。",
    ogLocale: "zh_CN",
    ogImageAlt: "Luby AI — 全球达人营销平台",
  },
  audience: ["广告主", "达人", "营销人员"],
  nav: {
    home: "Luby AI 首页",
    menu: [
      { label: "活动", href: "/zh/c" },
      { label: "创作者", href: "/zh/creators" },
      { label: "AI 功能", href: "#ai" },
      { label: "产品", href: "#features" },
      { label: "运作方式", href: "#how" },
      { label: "全球", href: "#global" },
      { label: "价格方案", href: "#pricing" },
      { label: "常见问题", href: "#faq" },
    ],
    login: "登录",
    cta: "免费开始",
    ctaShort: "开始",
  },
  hero: {
    eyebrow: "GLOBAL CAMPAIGN PLATFORM · 已覆盖 12 个国家",
    headlineLine1: "全球体验官，",
    headlineHighlight: "一次活动",
    headlineSuffix: "搞定。",
    sub1: "Luby AI 是用 AI 匹配全球网红与体验官的营销平台。",
    sub2: "从活动创建到甄选、内容发布，一站式完成。",
    ctaPrimary: "以广告主身份开始",
    ctaSecondary: "注册成为达人",
    card: {
      title: "全球美妆体验官招募",
      id: "活动 ID · #RUBY-2418",
      status: "招募中",
      stats: [
        { label: "报名者", value: "248人" },
        { label: "预计入选", value: "20人" },
        { label: "截止", value: "D-3" },
      ],
      tags: ["美妆", "护肤", "K-Beauty", "Instagram", "TikTok"],
      matchScore: "匹配分",
    },
  },
  socialProof: {
    stats: [
      { value: "12国", label: "活跃市场" },
      { value: "8,500+", label: "注册达人" },
      { value: "1,200+", label: "进行中活动" },
      { value: "24h", label: "平均响应" },
    ],
  },
  features: {
    label: "核心功能",
    heading1: "从立项到发布，",
    heading2: "一个工作台全搞定。",
    cards: [
      {
        title: "AI 匹配引擎",
        desc: "根据活动品类、预算和目标国家，自动推荐最合适的达人。",
      },
      {
        title: "五步活动构建器",
        desc: "基本信息 → 推广类型与渠道 → 日程 → 任务与关键词 → 提供内容。平均 7 分钟即可上线。",
      },
      {
        title: "全球达人资源池",
        desc: "在同一资源池中管理来自韩国、日本、东南亚和美洲的 Instagram、YouTube、TikTok 与博客渠道。",
      },
      {
        title: "报名与甄选流程",
        desc: "以卡片形式一目了然地比较报名者资料，一键完成入选/落选。",
      },
      {
        title: "角色专属仪表盘",
        desc: "为广告主、达人和运营者提供独立界面，各自聚焦关键指标。",
      },
      {
        title: "运营审核系统",
        desc: "多级审批流程，提前拦截虚假账号与不当内容。",
      },
    ],
    visuals: {
      matchTags: ["美妆", "时尚", "餐饮", "科技"],
      shieldTitle: "通过三级验证",
      shieldSub: "账号 · 内容 · 条款",
      shieldStatus: "已批准",
    },
  },
  howItWorks: {
    label: "运作方式",
    heading1: "广告主与达人，",
    heading2: "精准一步对接。",
    advertiser: {
      badge: "FOR BRANDS",
      title: "广告主",
      desc: "想要推广产品的品牌",
      cta: "以广告主身份开始",
      steps: [
        { title: "创建活动", desc: "用五步构建器约 7 分钟上线" },
        { title: "审核报名者", desc: "结合 AI 匹配分一目了然地比较" },
        { title: "甄选体验官", desc: "一键入选/落选" },
        { title: "收取内容", desc: "确认发布后自动结算" },
      ],
    },
    creator: {
      badge: "FOR CREATORS",
      title: "达人",
      desc: "喜爱体验的创作者",
      cta: "以创作者身份加入",
      steps: [
        { title: "绑定社交渠道", desc: "Instagram · YouTube · TikTok · 博客" },
        { title: "浏览活动", desc: "根据你的品类自动推荐" },
        { title: "报名并等待", desc: "平均 24 小时内出结果" },
        { title: "发布内容", desc: "体验后发布 → 累积积分" },
      ],
    },
  },
  global: {
    label: "全球",
    headingLine1: "从本土起步，",
    headingHighlight: "拓展至 12 个市场",
    headingSuffix: "。",
    paragraph:
      "多语言活动页面、本地支付、汇率自动换算。全球化不是可选项，而是 Luby AI 的默认配置。",
    bullets: [
      "8 种语言自动翻译 (KO/EN/JA/CN/TH/VI/ID/MS)",
      "本地货币支付与自动结算",
      "按地区的达人分级 / 验证系统",
      "按活动在全球 ↔ 本地间切换",
    ],
    channelsLabel: "渠道",
    totalLabel: "累计总渠道",
    newMarketLabel: "2026 新增市场",
  },
  pricing: {
    label: "价格方案",
    heading1: "随规模而变，",
    heading2: "灵活起步。",
    footnote: "所有方案均不含增值税（VAT）。付款后 7 天内 100% 退款。",
    recommendedBadge: "推荐",
    plans: [
      {
        period: "首个活动",
        desc: "为刚起步的品牌准备的免费方案",
        features: [
          "免费创建 1 个活动",
          "查看最多 10 名报名者",
          "基础数据仪表盘",
          "邮件支持",
        ],
        cta: "免费开始",
      },
      {
        period: "月",
        desc: "为成长期品牌准备的标准方案",
        features: [
          "无限创建活动",
          "AI 匹配全套",
          "高级仪表盘 · 优先展示",
          "无限查看报名者",
          "专属聊天支持",
        ],
        cta: "立即开始",
      },
      {
        period: "定制",
        desc: "为全球多品牌团队准备的专属方案",
        features: [
          "专属客户经理",
          "API · SSO 集成",
          "全球多品牌运营",
          "定制 SLA",
          "法务与税务咨询",
        ],
        cta: "咨询洽谈",
      },
    ],
  },
  faq: {
    heading: "常见问题",
    paragraph:
      "还有疑问？在我们的 Discord 社区，直接获得 Luby AI 团队和其他营销人的解答。",
    communityTitle: "5,000+ 营销人",
    communitySub: "已加入的社区",
    items: [
      {
        q: "Luby AI 适合什么样的公司？",
        a: "适合所有开展体验官/达人营销的品牌。无论是 D2C 美妆、餐饮、时尚品牌，还是准备出海的初创公司，不限活动规模均可使用。",
      },
      {
        q: "达人是如何审核的？",
        a: "需经过三级验证：社交账号认证、真实活动历史核查、运营人工审批。不合格账号会被自动过滤，一经发现违规行为将立即从资源池中移除。",
      },
      {
        q: "全球活动时使用哪种结算货币？",
        a: "广告主以本国货币付款，达人以所在国货币结算。汇率按结算时点自动换算，BUSINESS 及以上方案免手续费。",
      },
      {
        q: "用免费方案也能运营活动吗？",
        a: "可以。FREE 方案可免费创建 1 个活动并查看最多 10 名报名者，运营活动所需的核心功能一应俱全。",
      },
      {
        q: "内容版权归谁所有？",
        a: "默认情况下版权归达人所有。广告主在创建活动时可设定使用授权范围（二次利用、期限、媒介），经双方同意后协议生效。",
      },
      {
        q: "结算周期是怎样的？",
        a: "确认内容发布后，将在 7 个工作日内自动结算。ENTERPRISE 方案可选择每周或每两周的结算周期。",
      },
      {
        q: "可以在小红书等海外平台上做体验官活动吗？",
        a: "可以。除了 Instagram、YouTube、TikTok、博客和 Threads，创作者还可以登记小红书、抖音和 Lemon8 作为渠道，广告主在创建活动时指定所需渠道即可。由于中国及华语市场的游客会先在小红书上规划韩国行程、餐厅与购物，因此对到店型门店以及 K-Beauty / K-Food 品牌尤其有效。",
      },
    ],
  },
  cta: {
    badge: "现在注册，首个活动免费",
    headingLine1: "今天注册，",
    headingLine2Pre: "首个活动",
    headingHighlight: "免费",
    headingLine2Post: "。",
    sub: "无需信用卡，5 分钟即可开始。全球达人资源池即刻开放。",
    ctaPrimary: "免费开始",
    login: "登录",
  },
  footer: {
    tagline1: "用 AI 匹配全球体验官的营销平台。",
    tagline2: "始于韩国，覆盖 12 个市场。",
    columns: [
      {
        title: "产品",
        links: [
          { label: "招募中的活动", href: "/zh/c" },
          { label: "成为体验官", href: "/zh/creators" },
          { label: "功能介绍", href: "#features" },
          { label: "AI 功能", href: "#ai" },
          { label: "价格方案", href: "#pricing" },
          { label: "全球市场", href: "#global" },
        ],
      },
      {
        title: "公司",
        links: [
          { label: "应用场景", href: "#use-cases" },
          { label: "信任与安全", href: "#trust" },
          { label: "运作方式", href: "#how" },
          { label: "联系我们", href: "mailto:contact@plander.io" },
        ],
      },
      {
        title: "资源",
        links: [
          { label: "使用指南（韩文）", href: "/docs" },
          { label: "常见问题", href: "#faq" },
          { label: "价格说明", href: "#pricing" },
          { label: "客户支持", href: "mailto:contact@plander.io" },
          { label: "登录", href: "/login" },
        ],
      },
      {
        title: "法律",
        links: [
          { label: "服务条款", href: "/terms?lang=zh" },
          { label: "隐私政策", href: "/privacy?lang=zh" },
          { label: "广告主条款", href: "/terms?lang=zh#advertiser" },
          { label: "达人条款", href: "/terms?lang=zh#creator" },
        ],
      },
    ],
    copyright: "© 2026 Luby AI. 保留所有权利。",
    madeWith: "用心打造于 首尔 · 济州 · 上海 · 曼谷 · 纽约",
  },
  comingSoon: {
    title: "Beta 测试已完成",
    body1: "服务正在准备上线。",
    body2: "正式上线后再见。",
    emailPrefix: "💌 想收到正式上线通知？请发邮件至 ",
    emailSuffix: "。",
    confirm: "确定",
    close: "关闭",
  },
};

export const dictionaries: Record<Locale, Dict> = { ko, en, zh };

export function getDictionary(locale: Locale): Dict {
  return dictionaries[locale];
}
