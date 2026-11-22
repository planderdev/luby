# 루비AI (Luby)

글로벌 체험단 마케팅 양면 SaaS — https://luby.im
개발 가이드는 `.claude/skills/ruby-ai-development/SKILL.md`, 브랜드 값은 `BRAND.md`.

## 플랜더 프로젝트 카드

- 운영 방식: A. 플랜더 운영형 (플랜더 자체 서비스)
- 클라이언트: 주식회사 플랜더 (자체 서비스) / 담당자 확인 필요 / 계정용 공용 이메일 확인 필요
- 결정 기록:
  - 2026-11-22 카드 최초 작성. 이미 연결·운영 중인 상태(저장소 원격, `.vercel/project.json`, 개발 가이드)를 그대로 옮겨 적음. 운영 방식 A(플랜더 자체 서비스)는 같은 날 사용자 확인
  - 2026-11-22 GitHub `planderdev/luby` main 푸시 → Vercel 플랜더 팀 `luby` 프로젝트 배포를 사용자 확인 후 진행

| 서비스 | 소유 | 계정·팀 | 플랜더 권한 | 상태 |
|---|---|---|---|---|
| 도메인 | 플랜더 (자체 서비스) | `luby.im` · 구 도메인 `ruby-ai.kr`(308 리다이렉트), 등록처 예스닉 | 소유·DNS 관리 | 운영 중. 등록 명의·계정 이메일은 확인 필요 |
| GitHub | 플랜더 | `planderdev/luby` (main 만 사용) | 소유 | 운영 중 |
| Vercel | 플랜더 | 팀 `planderdevs-projects` (`team_3GbbjHZZhXI73Tk7bz348kci`), 프로젝트 `luby` | 소유 | 운영 중 · Pro 플랜(2026-08-23~) · 리전 icn1 · main 푸시 시 자동 배포 |
| Resend | 플랜더 | 플랜더 계정, 발신 도메인 `luby.im` 인증 (다른 프로젝트 JGCF 와 계정 공유) | 소유 | 운영 중 · Pro |
| Supabase | 플랜더 | 프로젝트 `RUBY` (`ncyuljyeyuorgsfuzzmw`, ap-northeast-2) | 소유 | 운영 중 |
| Toss Payments | 플랜더 | 결제위젯 키 + 자동결제(API 개별 연동) 키 | 소유 | 샌드박스 키. 라이브 전환은 토스 계약 후 |
| Anthropic API | 플랜더 | 플랜더 계정 | 소유 | 운영 중 |

- 환경 변수: `NEXT_PUBLIC_SUPABASE_URL` `NEXT_PUBLIC_SUPABASE_ANON_KEY` `SUPABASE_SERVICE_ROLE_KEY` `NEXT_PUBLIC_SITE_URL` `NEXT_PUBLIC_PRIMARY_DOMAIN` `ANTHROPIC_API_KEY` `NEXT_PUBLIC_TOSS_CLIENT_KEY` `TOSS_SECRET_KEY` `NEXT_PUBLIC_TOSS_BILLING_CLIENT_KEY` `TOSS_BILLING_SECRET_KEY` `RESEND_API_KEY` `NOTIFICATION_WEBHOOK_SECRET` `NEXT_PUBLIC_VAPID_PUBLIC_KEY` `VAPID_PRIVATE_KEY` `VAPID_SUBJECT` `NAVER_SITE_VERIFICATION` `YOUTUBE_API_KEY`
  - 값은 Vercel 환경 변수와 `.env.local` 에만 둔다. `.env.example` 에는 현재 7개만 적혀 있어 나머지 이름 추가 필요
- 개인정보: 플랜더가 직접 운영·처리하는 서비스라 위탁(수탁자) 기재 대상 아님. 실제 처리방침 문구는 `lib/legal/content.ts` 기준
