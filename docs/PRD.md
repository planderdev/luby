# Luby AI (루비AI) — 제품 요구사항 문서 (PRD)

> 글로벌 체험단 마케팅 양면 SaaS · https://luby.im · 최종 갱신 2026-08-19 · 프로덕션 가동 중
> 이 문서는 Manifest PRD 구조(개요 → 타깃 → 핵심 가치 → 성공 지표 → 기능 → 요구사항 → 명세)로 정리되어 있으며, 역할별 사용자 매뉴얼의 원본으로 사용한다.

---

## 1. 개요 (Overview)

**Luby AI**는 광고주(브랜드·자영업·마케팅 대행사)와 크리에이터(인플루언서)를 잇는 **AI 기반 글로벌 체험단 마케팅 플랫폼**이다.
광고주는 업종 한 줄만 입력하면 AI가 캠페인 전체(제목·채널별 미션·키워드·제공 내역·포인트)를 작성하고, 데이터로 크리에이터를 추천·초대하며, 제출 콘텐츠의 사전 검수까지 돕는다. 크리에이터는 내 분야·지역에 맞는 캠페인을 추천받아 응모하고, 체험 후 콘텐츠를 제출하면 검수 승인 즉시 포인트가 적립되어 계좌로 정산받는다.

- **도메인**: luby.im (구 ruby-ai.kr → 308 리다이렉트) · 랜딩·공개 페이지 3개 언어(KR/EN/CN)
- **활동 지역** 12개국(한국·일본·미국·대만·태국·베트남·인도네시아·필리핀·싱가포르·말레이시아·홍콩·중국)
- **지원 채널** 8종: Instagram · YouTube · TikTok · 블로그 · Threads · **Xiaohongshu(小红书)** · Douyin · Lemon8
- **수익 모델**: 광고주 구독(FREE / BUSINESS / ENTERPRISE) — 요금은 luby.im 요금 페이지 기준
- **포인트 경제**: 1P = 1원. 콘텐츠 승인 시 크리에이터에게 지급 → 1만P부터 계좌 출금 · 추천 보상 500P

## 2. 타깃 사용자 (Target)

| 역할 | 누구 | 핵심 니즈 |
|---|---|---|
| **광고주 — 브랜드·자영업** | 마케팅 전담 인력이 없는 D2C 브랜드, F&B·뷰티·리빙 매장, 신제품 출시 팀 | 공고 작성·모집·선정·검수의 수작업 제거, 해외(특히 중국·화교권) 관광객·소비자 도달 |
| **광고주 — 마케팅 대행사·실행사** | 여러 클라이언트의 체험단을 운영하는 에이전시 | 클라이언트별 캠페인 반복 생성, 크리에이터 검색·초대, 클라이언트 보고 자료 |
| **크리에이터** | 나노~마이크로 인플루언서(인스타·유튜브·틱톡·블로그·샤오홍슈 등), 한국 및 해외 거주 | 내 분야 캠페인 추천, 간단한 응모·제출, 투명한 포인트 정산 |
| **운영자** | Luby AI 운영팀 | 회원 승인·캠페인 검수·정산·통계를 최소 인력으로 |

## 3. 핵심 가치 (Core Value)

1. **AI가 실제로 일한다** — 캠페인 라이터(20초 초안, 채널별 형식 가이드), 크리에이터 매칭(적합도·이유), 콘텐츠 사전 검수, 운영자 검수 보조(표시·광고법 체크), 응모 메시지 초안
2. **글로벌은 채널부터** — 시장별로 소비자가 후기를 찾는 앱이 다르다는 전제로 샤오홍슈·Douyin·Lemon8까지 채널 단위 등록·모집, 공개 페이지 3개 언어
3. **한 화면에서 끝** — 응모→선정→채팅→제출→검수→포인트→정산 워크플로 + 알림·리마인더 자동화
4. **신뢰 가능한 정산** — 승인 즉시 적립, 원장 기반 내역, 출금 이중지출 방지, 운영자 정산 CSV

## 4. 성공 지표 (Success Metrics)

| 지표 | 계측 |
|---|---|
| 방문 → 가입 전환율 (역할별) | Vercel Analytics `signup_completed{role, referred}` |
| 광고주 가입 → 첫 캠페인 생성 | `campaign_created{mode, ai}` / 리마인더 A규칙 |
| AI 자동작성 사용률·제출 전환 | `campaign_created{ai:yes}` 비율 |
| 캠페인당 응모 수·선정률·승인율·예상 도달 | 캠페인 성과 카드 · 완료 리포트 알림 |
| BUSINESS 전환·매출 | `checkout_started` → `payment_completed`, 운영자 통계 재무 카드 |
| 크리에이터 활성(응모/제출) · 프로필 완성도 | 완성도 게이지, 리마인더 F규칙 |
| 바이럴 | `profiles.referred_by`, 운영자 통계 추천 유입 추이, 추천 보상 원장 |
| 운영 효율 | 검수 대기 체류 시간, 운영자 다이제스트 |

## 5. 기능 (Features)

### 5.1 공통 · 계정
- 이메일 가입(역할 선택: 광고주 / 크리에이터), 이메일 인증, 비밀번호 재설정(Resend 브랜드 메일)
- **소셜 로그인(Google·Kakao)** — 콜백 → 온보딩에서 역할 1회 확정 (콘솔 키 등록 후 활성화)
- 광고주 유형: **브랜드·자영업 / 마케팅 대행사·실행사** (가입·설정에서 선택, 프로필·운영자 배지)
- 추천 가입: 공유 링크 `?ref=` → `referred_by` 저장, 자기 추천·무효 방어
- 알림: 인앱 + 이메일(카테고리 3종 수신 설정, 원클릭 수신 거부), 알림 벨·목록·읽음
- 다크/라이트, 모바일 하단 탭바, PWA(홈 화면 추가·바로가기), 브랜드 404/에러 페이지

### 5.2 광고주
- **캠페인 빌더 5단계**(기본→홍보·채널→일정→모집→제공·포인트) + AI 필드 추천 + "AI에게 전부 맡기기"(진행 상황 표시)
- 캠페인 상태: 초안 → 검수 요청 → 모집중 → 마감 → 완료 / 취소. **캠페인 취소**(응모자 알림), **복제**(이전 캠페인으로 새로 만들기), 응모자 있는 캠페인 삭제 불가
- 응모자 관리: 목록·선정/미선정, AI 콘텐츠 사전 검수, 채팅(BUSINESS), 초대(BUSINESS)
- **크리에이터 검색**: 검색어·업종·지역·채널·팔로워·정렬 + 빠른 필터(샤오홍슈·Douyin·Lemon8·공개 프로필 있음), 크리에이터 상세·포트폴리오
- **캠페인 성과**: 진행률·경쟁률·예상 도달·지급 포인트·퍼널·채널별 도달; 목록 카드 성과 칩; **완료 시 성과 리포트 알림**
- **공개 캠페인 페이지** `/c/[id]`(KR/EN/CN, OG·JSON-LD·사이트맵) + 공유 링크 드롭다운
- 회사 프로필 완성도(소개·업종·로고·웹사이트·연락처), 광고주 공개 프로필(크리에이터가 열람)
- 구독·결제: FREE/BUSINESS/ENTERPRISE, 토스 결제위젯, 만료 안내·자동 강등, 플랜 제한 DB 강제

### 5.3 크리에이터
- 프로필: 소개·지역·전문 분야(최대 3)·채널(8종, URL 도메인 검증·핸들 힌트)·**프로필 완성도 게이지**
- 캠페인 탐색: 추천순(내 분야·지역·응모 여부 배지)·마감 임박·포인트순·필터, 개요 홈 "내게 맞는 캠페인"
- 응모(**AI 응모 메시지 초대**)·취소, 초대 수락/거절(수락 시 자동 응모), 채팅(선정 후), 콘텐츠 제출·재제출
- **포인트**: 잔액·**내역 원장**(콘텐츠 승인·추천 보상·출금), 출금 신청(1만P↑)·처리 결과
- **공개 프로필** `/p/[id]`(옵트인, KR/EN/CN, 링크 복사), **친구에게 공유**(?ref) → **추천 보상 500P**(첫 체험 완료 시, 월 5회)

### 5.4 운영자
- 회원 관리(일괄 승인·검색·사업자 정보·대행사 배지·추천인), 캠페인 검수(**AI 사전 점검**: 표시·광고법 체크리스트)
- 정산 관리(지급/반려·자동 환불) · 결제 내역 · **CSV 내보내기**(결제·정산, 기간)
- 통계: KPI·상태 분포·**8주 추이 5차트**(가입·캠페인/응모·승인/포인트·매출·추천 유입)·재무 카드
- 아침 업무 다이제스트 알림, 신규 크리에이터 가입 알림, 검수 요청 알림

### 5.5 자동화 (pg_cron / 트리거)
- 매시 캠페인 자동 마감(상시 모집 제외) · 매일 구독 만료 안내 · **매일 09:30 리마인더 8규칙**(첫 캠페인·임시저장·선정 지연·제출 독려·검수 지연·프로필 완성·마감 임박 맞춤·운영자 다이제스트) — 이메일 수신 설정 존중, 중복 방지
- 캠페인 자동 완료(선정자 전원 승인 시) + 성과 리포트, 추천 보상 지급, 알림→이메일 웹훅

## 6. 요구사항 (Requirements)

### 6.1 기능 요구사항 (요약)
- 모든 금전·상태 변경은 DB SECURITY DEFINER 함수/트리거에서 원자적으로 처리(포인트 지급, 출금, 결제 승인, 완료 전환)
- 플랜 제한(FREE 캠페인 1건)·역할·승인·추천인 등 민감 컬럼은 **DB 레벨**에서 강제(앱 우회 불가)
- 공개 표면(랜딩·/c·/p)은 로그인 없이 접근, 민감정보 제외 RPC로만 조회
- 이메일: 인증 메일(Supabase SMTP=Resend, 브랜드 템플릿 5종), 알림 메일(수신 설정·수신 거부 링크·사업자 표기)

### 6.2 비기능 요구사항
- 보안: RLS 전 테이블, `(select auth.uid())` 패턴, 권한 상승·자가 선정·캠페인 삭제 방어 트리거, HSTS·nosniff·X-Frame·Referrer·Permissions 헤더, Storage 폴더/MIME/용량 정책
- 성능: 카탈로그 캐시 5분, 공개 페이지 ISR 5분, FK 인덱스, 사이트맵 1시간 재생성
- 법·정책: 이용약관·개인정보처리방침(3개 언어), 푸터 사업자 정보, 광고 표기 안내, 광고성 메일 수신 거부
- 관측: Vercel Analytics·Speed Insights, 전환 이벤트 5종, 운영자 통계

### 6.3 운영 요구사항 (사람이 하는 일)
- 크리에이터 가입 승인(보통 24시간 이내), 캠페인 검수(AI 사전 점검 참고), 정산 지급, 토스 라이브 키 관리, Resend 도메인 평판 관리

## 7. 명세 (Specs)

### 7.1 핵심 상태 머신
```
캠페인: draft → pending_approval → open → closed → completed
                        ↓ 반려/취소                ↑ 선정자 전원 승인 시 자동
                     cancelled  ←── open/closed 에서 광고주 취소(응모자 알림)
응모: pending → selected → completed | rejected | cancelled(크리에이터 취소/캠페인 취소)
제출: submitted → approved | revision_requested → (재제출) submitted
출금: requested → paid | rejected(자동 환불)
```

### 7.2 주요 화면(라우트)
| 영역 | 경로 |
|---|---|
| 랜딩 | `/`, `/en`, `/zh`(표기 CN, `/cn` 별칭) · `/terms` `/privacy` |
| 인증 | `/signup?role=&redirect=&ref=` `/login` `/forgot-password` `/reset-password` `/onboarding` `/auth/callback` |
| 공개 | `/c/[id]`(+`/en`,`/zh`) 캠페인 · `/p/[id]`(+`/en`,`/zh`) 크리에이터 |
| 대시보드 공통 | `/dashboard` `/dashboard/notifications` `/dashboard/settings`(#channels #categories #email #public) `/dashboard/messages` |
| 광고주 | `/dashboard/campaigns` `/dashboard/campaigns/new(?from=)` `/dashboard/campaigns/[id]` `/dashboard/creators` `/dashboard/creators/[id]` `/dashboard/billing` |
| 크리에이터 | `/dashboard/campaigns` `/dashboard/applications` `/dashboard/invitations` `/dashboard/points` `/dashboard/advertisers/[id]` |
| 운영자 | `/dashboard/operator/users` `/campaigns` `/withdrawals` `/payments` `/stats` |

### 7.3 데이터 모델(주요)
profiles(role, approved, referred_by, email_prefs, onboarding_done) · advertisers(advertiser_kind, company…) · influencers(bio, region, total_points, public_profile) · influencer_channels · influencer_categories · campaigns(+channels/missions/keywords/offerings/schedules, ai_precheck) · applications · submissions(ai_review) · messages · campaign_invitations · notifications · payments · subscriptions/plans · point_withdrawals · referral_rewards

### 7.4 AI
- 캠페인 라이터: Sonnet 5(adaptive, effort low/medium), 구조화 출력, 채널별 콘텐츠 가이드(샤오홍슈 笔记 등), 카탈로그 ID 검증
- 매칭·검수·사전 점검: Opus 5(effort low/medium) — 확인 가능한 것만 판정, 최종 판단은 사람

### 7.5 통합
- Supabase(Postgres·Auth·Storage·pg_cron·pg_net) · Resend(notify@luby.im) · 토스페이먼츠 · Anthropic · Vercel(Analytics)

---

## 부록 A. 역할별 사용자 매뉴얼 목차(초안)
1. **광고주 매뉴얼**: 가입·유형 선택 → 회사 프로필 → 캠페인 만들기(AI 전부 맡기기/직접) → 검수 요청 → 공유 링크·초대·AI 매칭 → 응모자 선정 → 채팅 → 콘텐츠 검수(AI 사전 검수) → 성과 리포트 → 복제/취소 → 구독·결제 → 알림·이메일 설정
2. **크리에이터 매뉴얼**: 가입·승인 → 프로필 완성(채널·분야·소개) → 캠페인 찾기·추천 → 응모(AI 초안)·초대 응답 → 선정 후 채팅·체험 → 콘텐츠 제출·재제출 → 포인트 내역·출금 → 공개 프로필·친구 추천(500P) → 홈 화면 추가
3. **대행사 매뉴얼**: 대행사 유형 가입 → 클라이언트별 캠페인(상호 입력·복제) → 크리에이터 검색(샤오홍슈 필터) → 검수 AI·성과 리포트로 보고 → BUSINESS 플랜
4. **운영자 매뉴얼**: 회원 승인 → 캠페인 검수(AI 사전 점검) → 정산 처리·CSV → 통계·다이제스트 → 계정·이메일 운영(Resend·SMTP·템플릿)
