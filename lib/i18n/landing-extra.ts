import type { Locale } from "./config";

/**
 * 홈페이지 개편(피쳐링 레퍼런스 구조)으로 추가된 섹션 딕셔너리.
 * 구조가 안정화되면 dictionaries.ts로 합칠 수 있음.
 *
 * 규칙은 동일: ko가 소스 오브 트루스, en/zh는 같은 shape 강제.
 */

const ko = {
  aiCapability: {
    label: "AI가 일합니다",
    heading1: "캠페인 기획부터 섭외까지,",
    heading2: "AI에게 맡기세요.",
    sub: "루비AI의 AI는 데모가 아니라 실제로 일하는 동료입니다. 업종 한 줄만 알려주면 캠페인 전체를 작성하고, 등록된 인플루언서 풀에서 최적의 후보를 골라냅니다.",
    writer: {
      badge: "AI 캠페인 라이터",
      title: "업종 한 줄 → 캠페인 완성",
      desc: "제목, 홍보 채널, 채널별 미션, 키워드, 제공 내역, 포인트까지 — 평균 20초 안에 발행 가능한 수준으로 자동 작성합니다. 마음에 안 들면 다시 누르면 그만.",
      inputLabel: "광고주가 입력하는 것",
      inputExample: "“강남 비건 카페, 신메뉴 비건 라떼 출시”",
      outputLabel: "AI가 작성하는 것",
      outputs: ["캠페인 제목 3안", "홍보유형·카테고리·채널 조합", "채널별 콘텐츠 미션", "해시태그 키워드 5~8개", "제공 내역 + 적정 포인트"],
    },
    matcher: {
      badge: "AI 인플루언서 매칭",
      title: "감이 아니라 데이터로 섭외",
      desc: "캠페인의 업종·지역·채널 조건과 인플루언서의 활동 데이터를 교차 분석해 적합도 점수와 추천 이유를 함께 제시합니다. 명단 만들기에 쓰던 시간을 돌려드립니다.",
      sampleTitle: "매칭 결과 미리보기",
      matches: [
        { handle: "@minji_seoul", meta: "KR · 뷰티 · 102K", score: 97, reason: "카테고리·지역 완벽 일치, 유사 캠페인 완주 이력" },
        { handle: "@haru.tokyo", meta: "JP · 카페 · 24.1K", score: 94, reason: "F&B 콘텐츠 비중 높음, 타깃 연령대 부합" },
        { handle: "@vegan.daily", meta: "KR · 라이프 · 58K", score: 91, reason: "비건 키워드 상위 노출, 참여율 우수" },
      ],
    },
    stats: [
      { value: "20초", label: "캠페인 자동 작성" },
      { value: "0건", label: "직접 써야 하는 항목" },
      { value: "24/7", label: "AI는 퇴근하지 않음" },
    ],
  },
  useCases: {
    label: "활용 사례",
    heading1: "이런 팀이",
    heading2: "루비AI로 시작합니다.",
    cases: [
      {
        emoji: "💄",
        title: "뷰티 D2C 브랜드",
        scenario: "신제품 출시 때마다 체험단 모집 공고를 쓰고, DM으로 지원자를 받고, 엑셀로 선정하던 팀.",
        wins: ["AI가 캠페인 문안 자동 작성", "응모→선정→발행을 한 화면에서", "K뷰티 수요가 있는 해외 마켓 동시 모집"],
      },
      {
        emoji: "🍜",
        title: "F&B 매장·프랜차이즈",
        scenario: "방문 체험단이 필요하지만 마케팅 담당자가 따로 없는 매장. 예약 요일·시간 조율이 늘 골치.",
        wins: ["체험 가능 요일·시간을 캠페인에 내장", "당일 예약·24시간 옵션 지원", "지역 기반 인플루언서 자동 추천"],
      },
      {
        emoji: "🚀",
        title: "글로벌 진출 스타트업",
        scenario: "일본·동남아 시장을 테스트하고 싶지만 현지 에이전시 비용과 언어 장벽이 부담인 팀.",
        wins: ["12개국 인플루언서 풀에 한 번에 등록", "현지어 캠페인 페이지 자동 대응", "국가별 반응을 한 대시보드에서 비교"],
      },
    ],
  },
  platforms: {
    label: "글로벌 플랫폼",
    heading1: "인스타그램만으로는",
    heading2: "글로벌이 아닙니다.",
    sub: "나라마다 소비자가 '진짜 후기'를 찾는 앱이 다릅니다. 루비AI는 크리에이터를 채널 단위로 등록받아, 시장별로 실제 구매·방문을 움직이는 플랫폼에서 체험단을 모집합니다.",
    featured: {
      name: "샤오홍슈 (小红书 · RedNote)",
      tag: "중국 · 화교권 필수",
      desc: "중국 MZ 여성이 뷰티·맛집·여행을 '검색'하는 곳. 광고 같은 콘텐츠는 걸러지고, 실사용 후기(种草·씨딩)만 살아남는 커뮤니티라 체험단과 궁합이 가장 좋은 플랫폼입니다.",
      stats: [
        { value: "3억+", label: "월간 활성 사용자" },
        { value: "70%", label: "18~35세 여성 비중" },
        { value: "83%", label: "광고 아닌 사용자 후기로 제품 발견" },
      ],
      points: [
        "중국·홍콩·대만·싱가포르 관광객이 한국 여행 코스·맛집·쇼핑을 샤오홍슈에서 미리 정합니다 — 매장 후기 하나가 방문으로 이어집니다.",
        "K뷰티·K푸드는 샤오홍슈 인기 카테고리. 대형 KOL 1명보다 KOC(일반 크리에이터) 20~50명의 실후기가 전환을 만듭니다.",
        "루비AI에서 샤오홍슈를 대표 채널로 등록한 크리에이터에게 바로 캠페인을 열 수 있어요.",
      ],
    },
    othersLabel: "함께 지원하는 채널",
    others: [
      { name: "Instagram", region: "글로벌" },
      { name: "YouTube", region: "글로벌" },
      { name: "TikTok", region: "글로벌 · 동남아" },
      { name: "Threads", region: "글로벌" },
      { name: "네이버 블로그", region: "한국" },
      { name: "Douyin (抖音)", region: "중국" },
      { name: "Lemon8", region: "일본 · 동남아" },
    ],
    footnote: "수치는 플랫폼 공개 자료·업계 리포트(2026) 기준이며 시점에 따라 달라질 수 있습니다.",
  },
  trust: {
    label: "신뢰와 보안",
    heading1: "성장은 빠르게,",
    heading2: "기본은 단단하게.",
    items: [
      {
        title: "행 단위 데이터 접근 제어",
        desc: "모든 테이블에 RLS(Row Level Security)를 적용해, 본인 데이터가 아니면 쿼리 자체가 차단됩니다.",
      },
      {
        title: "토스페이먼츠 결제",
        desc: "결제는 토스페이먼츠 인증 결제창에서 처리됩니다. 카드 정보는 루비AI 서버에 저장되지 않습니다.",
      },
      {
        title: "3단계 검수 시스템",
        desc: "인플루언서 계정 인증, 활동 이력 확인, 운영자 수동 승인 — 가짜 계정은 풀에 들어오지 못합니다.",
      },
      {
        title: "엔터프라이즈급 인프라",
        desc: "글로벌 엣지 네트워크와 서울 리전 데이터베이스로, 국내외 어디서든 빠르고 안정적으로 동작합니다.",
      },
    ],
    footnote: "결제·개인정보 관련 문의는 contact@plander.io 로 언제든 연락주세요.",
  },
} as const;

export type ExtraDict = {
  aiCapability: {
    label: string;
    heading1: string;
    heading2: string;
    sub: string;
    writer: {
      badge: string;
      title: string;
      desc: string;
      inputLabel: string;
      inputExample: string;
      outputLabel: string;
      outputs: readonly string[];
    };
    matcher: {
      badge: string;
      title: string;
      desc: string;
      sampleTitle: string;
      matches: readonly { handle: string; meta: string; score: number; reason: string }[];
    };
    stats: readonly { value: string; label: string }[];
  };
  useCases: {
    label: string;
    heading1: string;
    heading2: string;
    cases: readonly {
      emoji: string;
      title: string;
      scenario: string;
      wins: readonly string[];
    }[];
  };
  platforms: {
    label: string;
    heading1: string;
    heading2: string;
    sub: string;
    featured: {
      name: string;
      tag: string;
      desc: string;
      stats: readonly { value: string; label: string }[];
      points: readonly string[];
    };
    othersLabel: string;
    others: readonly { name: string; region: string }[];
    footnote: string;
  };
  trust: {
    label: string;
    heading1: string;
    heading2: string;
    items: readonly { title: string; desc: string }[];
    footnote: string;
  };
};

const en: ExtraDict = {
  aiCapability: {
    label: "AI does the work",
    heading1: "From campaign brief to casting,",
    heading2: "let the AI handle it.",
    sub: "Luby AI's assistant isn't a demo — it's a working teammate. Give it one line about your business and it drafts the entire campaign, then shortlists the best-fit creators from the pool.",
    writer: {
      badge: "AI Campaign Writer",
      title: "One line in → full campaign out",
      desc: "Title, channels, per-channel missions, keywords, offerings and points — drafted to publish-ready quality in about 20 seconds. Don't like it? Run it again.",
      inputLabel: "What you type",
      inputExample: "“Vegan cafe in Gangnam launching a new vegan latte”",
      outputLabel: "What the AI writes",
      outputs: ["3 title options", "Promotion type, category & channel mix", "Per-channel content missions", "5–8 hashtag keywords", "Offerings + suggested points"],
    },
    matcher: {
      badge: "AI Creator Matching",
      title: "Cast with data, not gut feel",
      desc: "It cross-references your campaign's industry, region and channels against creator activity data, returning a fit score with plain-language reasoning. Get your list-building hours back.",
      sampleTitle: "Matching preview",
      matches: [
        { handle: "@minji_seoul", meta: "KR · Beauty · 102K", score: 97, reason: "Perfect category & region fit, completed similar campaigns" },
        { handle: "@haru.tokyo", meta: "JP · Cafe · 24.1K", score: 94, reason: "Strong F&B content share, matching audience age" },
        { handle: "@vegan.daily", meta: "KR · Lifestyle · 58K", score: 91, reason: "Ranks for vegan keywords, high engagement" },
      ],
    },
    stats: [
      { value: "20s", label: "to draft a campaign" },
      { value: "0", label: "fields you must write yourself" },
      { value: "24/7", label: "the AI never clocks out" },
    ],
  },
  useCases: {
    label: "Use cases",
    heading1: "Teams like these",
    heading2: "start with Luby AI.",
    cases: [
      {
        emoji: "💄",
        title: "Beauty D2C brands",
        scenario: "The team that wrote recruitment posts, collected applicants over DMs, and picked winners in a spreadsheet for every launch.",
        wins: ["AI drafts the campaign copy", "Apply → select → publish in one screen", "Recruit across K-beauty demand markets at once"],
      },
      {
        emoji: "🍜",
        title: "F&B stores & franchises",
        scenario: "Stores that need visit-based creators but have no dedicated marketer. Scheduling visits is a constant headache.",
        wins: ["Visit days & hours built into the campaign", "Same-day booking & 24h options", "Location-based creator recommendations"],
      },
      {
        emoji: "🚀",
        title: "Startups going global",
        scenario: "Teams that want to test Japan or Southeast Asia but are blocked by agency costs and language barriers.",
        wins: ["One listing reaches a 12-market creator pool", "Localized campaign pages handled for you", "Compare market response in one dashboard"],
      },
    ],
  },
  platforms: {
    label: "Global platforms",
    heading1: "Instagram alone",
    heading2: "isn't global.",
    sub: "Every market has its own app where shoppers look for real reviews. Luby AI registers creators by channel and recruits reviewers on the platform that actually drives purchases and visits in each market.",
    featured: {
      name: "Xiaohongshu (小红书 · RedNote)",
      tag: "Essential for China & Chinese-speaking markets",
      desc: "Where young Chinese women search for beauty, food and travel. Ad-like posts get filtered out; only genuine, first-hand reviews (种草 'seeding') survive — which makes it the best-fit platform for reviewer campaigns.",
      stats: [
        { value: "300M+", label: "monthly active users" },
        { value: "70%", label: "women aged 18–35" },
        { value: "83%", label: "discover products via user reviews, not ads" },
      ],
      points: [
        "Travelers from China, Hong Kong, Taiwan and Singapore plan Korea trips — restaurants, routes, shopping — on Xiaohongshu first. One honest store review turns into visits.",
        "K-beauty and K-food are top categories. 20–50 KOC (everyday creator) reviews convert better than one celebrity KOL.",
        "Open a campaign directly to creators who registered Xiaohongshu as their main channel on Luby AI.",
      ],
    },
    othersLabel: "Also supported",
    others: [
      { name: "Instagram", region: "Global" },
      { name: "YouTube", region: "Global" },
      { name: "TikTok", region: "Global · SEA" },
      { name: "Threads", region: "Global" },
      { name: "Naver Blog", region: "Korea" },
      { name: "Douyin (抖音)", region: "China" },
      { name: "Lemon8", region: "Japan · SEA" },
    ],
    footnote: "Figures are based on platform disclosures and industry reports (2026) and may change over time.",
  },
  trust: {
    label: "Trust & security",
    heading1: "Move fast,",
    heading2: "on solid ground.",
    items: [
      {
        title: "Row-level data access control",
        desc: "Every table enforces RLS — queries on data you don't own are blocked at the database layer.",
      },
      {
        title: "Payments by Toss Payments",
        desc: "Checkout runs in Toss Payments' certified window. Card details never touch Luby AI servers.",
      },
      {
        title: "3-step verification",
        desc: "Account verification, activity history review and manual operator approval — fake accounts don't make it into the pool.",
      },
      {
        title: "Enterprise-grade infrastructure",
        desc: "A global edge network with a Seoul-region database keeps things fast and reliable, at home and abroad.",
      },
    ],
    footnote: "Questions about payments or privacy? Reach us anytime at contact@plander.io.",
  },
};

const zh: ExtraDict = {
  aiCapability: {
    label: "AI 替你工作",
    heading1: "从策划到选人，",
    heading2: "交给 AI 完成。",
    sub: "Luby AI 的 AI 不是演示功能，而是真正干活的同事。只需一句话描述你的业务，它就能写出完整的活动方案，并从达人库中挑选最合适的人选。",
    writer: {
      badge: "AI 活动撰写",
      title: "一句话输入 → 完整活动方案",
      desc: "标题、推广渠道、各渠道任务、关键词、提供内容与积分——约 20 秒生成可直接发布的方案。不满意？再点一次即可。",
      inputLabel: "你只需输入",
      inputExample: "“江南素食咖啡店，新品素食拿铁上市”",
      outputLabel: "AI 为你完成",
      outputs: ["3 个标题方案", "推广类型·类目·渠道组合", "各渠道内容任务", "5–8 个话题关键词", "提供内容 + 建议积分"],
    },
    matcher: {
      badge: "AI 达人匹配",
      title: "用数据选人，而非凭感觉",
      desc: "交叉分析活动的行业、地区、渠道条件与达人活动数据，给出匹配分数和推荐理由。把做名单的时间还给你。",
      sampleTitle: "匹配结果预览",
      matches: [
        { handle: "@minji_seoul", meta: "KR · 美妆 · 102K", score: 97, reason: "类目与地区完全匹配，有同类活动完成记录" },
        { handle: "@haru.tokyo", meta: "JP · 咖啡 · 24.1K", score: 94, reason: "餐饮内容占比高，受众年龄契合" },
        { handle: "@vegan.daily", meta: "KR · 生活方式 · 58K", score: 91, reason: "素食关键词排名靠前，互动率优秀" },
      ],
    },
    stats: [
      { value: "20秒", label: "自动生成活动方案" },
      { value: "0项", label: "需要你亲自撰写" },
      { value: "24/7", label: "AI 从不下班" },
    ],
  },
  useCases: {
    label: "应用场景",
    heading1: "这些团队",
    heading2: "正在用 Luby AI 起步。",
    cases: [
      {
        emoji: "💄",
        title: "美妆 D2C 品牌",
        scenario: "每次新品上市都要写招募帖、私信收集报名、用表格选人的团队。",
        wins: ["AI 自动撰写活动文案", "报名→选定→发布一站完成", "同步覆盖有 K-beauty 需求的海外市场"],
      },
      {
        emoji: "🍜",
        title: "餐饮门店·连锁",
        scenario: "需要到店体验达人、却没有专职市场人员的门店。预约时间协调一直是难题。",
        wins: ["体验时段直接内置于活动", "支持当日预约与 24 小时选项", "基于地区自动推荐达人"],
      },
      {
        emoji: "🚀",
        title: "出海创业公司",
        scenario: "想测试日本、东南亚市场，却被当地代理费用和语言门槛挡住的团队。",
        wins: ["一次发布触达 12 国达人库", "本地化活动页面自动处理", "在一个后台对比各国反响"],
      },
    ],
  },
  platforms: {
    label: "全球平台",
    heading1: "只有 Instagram",
    heading2: "算不上全球化。",
    sub: "每个市场的消费者寻找「真实评价」的 App 都不一样。Luby AI 按渠道登记创作者，在真正带动购买与到店的平台上招募体验官。",
    featured: {
      name: "小红书 (Xiaohongshu · RedNote)",
      tag: "中国及华语市场必备",
      desc: "年轻女性搜索美妆、美食与旅行的地方。广告味的内容会被过滤，只有真实的亲测笔记（种草）能留下——这正是与体验官营销最契合的平台。",
      stats: [
        { value: "3亿+", label: "月活跃用户" },
        { value: "70%", label: "18–35 岁女性占比" },
        { value: "83%", label: "通过用户笔记而非广告发现产品" },
      ],
      points: [
        "来自中国大陆、香港、台湾、新加坡的游客会先在小红书上规划韩国行程——餐厅、路线、购物。一篇真实的门店笔记就能带来到店。",
        "K-Beauty 与 K-Food 是热门品类。20–50 位 KOC（普通创作者）的真实笔记，比 1 位头部 KOL 更能带来转化。",
        "可直接向在 Luby AI 上以小红书为主渠道的创作者发布活动。",
      ],
    },
    othersLabel: "同时支持",
    others: [
      { name: "Instagram", region: "全球" },
      { name: "YouTube", region: "全球" },
      { name: "TikTok", region: "全球 · 东南亚" },
      { name: "Threads", region: "全球" },
      { name: "Naver 博客", region: "韩国" },
      { name: "抖音 (Douyin)", region: "中国" },
      { name: "Lemon8", region: "日本 · 东南亚" },
    ],
    footnote: "数据来源于平台公开资料与行业报告（2026），可能随时间变化。",
  },
  trust: {
    label: "信任与安全",
    heading1: "跑得快，",
    heading2: "更站得稳。",
    items: [
      {
        title: "行级数据访问控制",
        desc: "所有数据表启用 RLS——不属于你的数据，查询在数据库层即被拦截。",
      },
      {
        title: "Toss Payments 支付",
        desc: "支付在 Toss Payments 认证窗口中完成，卡片信息不会经过 Luby AI 服务器。",
      },
      {
        title: "三重审核体系",
        desc: "账号认证、活动履历审查、运营人工批准——虚假账号进不了达人库。",
      },
      {
        title: "企业级基础设施",
        desc: "全球边缘网络 + 首尔区域数据库，国内外访问都快速稳定。",
      },
    ],
    footnote: "支付或隐私相关问题，欢迎随时联系 contact@plander.io。",
  },
};

export const extraDictionaries: Record<Locale, ExtraDict> = { ko, en, zh };
