# Luby AI 이메일 템플릿

Supabase Auth 가 보내는 5종 트랜잭션 이메일을 Luby AI 브랜드에 맞춰 디자인한 HTML 템플릿입니다.

## 파일 구조

| 파일 | 용도 | Supabase 매핑 |
|---|---|---|
| `01-confirm-signup.html` | 회원가입 시 이메일 인증 | **Confirm signup** |
| `02-magic-link.html` | 비밀번호 없이 매직링크 로그인 | **Magic Link** |
| `03-reset-password.html` | 비밀번호 재설정 | **Reset Password** |
| `04-change-email.html` | 이메일 주소 변경 확인 | **Change Email Address** |
| `05-invite-user.html` | 운영자가 사용자 초대 | **Invite user** |
| `_partials/wrapper.html` | (참고용) 공유 래퍼 — 직접 사용 X | — |
| `i18n-build.mjs` | 한·영·중 분기 템플릿 생성·자가 검증 스크립트 | — |

## 적용 상태

**2026-10-09 프로덕션 적용 완료** — 5종 모두 한·영·중 분기 본문과 세 언어 병기 제목으로 교체했고, 다시 읽어 파일과 글자 단위로 일치함을 확인했습니다.

## 한 번에 적용하기 (권장)

```
npx supabase login                        # 최초 1회 — 토큰이 macOS 키체인에 저장됨
node emails/apply-to-supabase.mjs --dry-run   # 본문 검사만
node emails/apply-to-supabase.mjs             # 5종 제목·본문 교체 + 재조회 검증
```

Supabase 관리 API(`PATCH /v1/projects/{ref}/config/auth`)로 제목·본문을 한 번에 넣습니다. 토큰은 `SUPABASE_ACCESS_TOKEN` 이 있으면 그것을, 없으면 키체인 값을 쓰며 출력하지 않습니다.
`supabase login` 이 "Press Enter" 에서 멈추면 Enter 를 누르고, 브라우저 승인 화면의 8자리 코드를 터미널에 입력합니다.

## (수동) Supabase 대시보드에 적용하기

1. **Auth → Email Templates** 열기
   https://supabase.com/dashboard/project/ncyuljyeyuorgsfuzzmw/auth/templates

2. 각 템플릿에 대해 좌측에서 종류 선택 후:
   - **Subject** 필드에 아래 제목 입력
   - **Message Body (HTML)** 에 해당 HTML 파일 내용 전체 복붙
   - **Save** 클릭

## 제목 (Subject) 모음

| 템플릿 | 제목 (복붙용 — 한·영·중 병기, 제목은 분기 없이 한 줄) |
|---|---|
| Confirm signup | `Luby AI 이메일 인증 · Verify your email · 邮箱验证` |
| Magic Link | `Luby AI 로그인 링크 · Your login link · 登录链接` |
| Reset Password | `Luby AI 비밀번호 재설정 · Reset your password · 重置密码` |
| Change Email Address | `Luby AI 이메일 변경 확인 · Confirm email change · 确认更改邮箱` |
| Invite user | `Luby AI에 초대되었어요 · You're invited · 邀请函` |

## 한·영·중 분기 (2026-10-07)

본문 HTML 은 Go 템플릿 분기로 **수신자 언어에 맞춰** 렌더됩니다. 가입 폼이 `options.data.locale`(ko/en/zh)을 넣으므로
Supabase 가 `{{ .Data.locale }}` 로 읽을 수 있고, 값이 없거나 다른 값이면 한국어로 떨어집니다.

- 파일 첫 줄의 선언 `{{ $l := printf "%v" .Data.locale }}…` 을 지우지 마세요(이게 언어를 정합니다).
- 한국어 원문은 각 분기의 `{{ else }}` 가지에 그대로 있습니다. 문구를 고칠 때는 `emails/i18n-build.mjs` 의 표를 고치고
  git 에서 원본(한국어 단일) 파일을 되돌린 뒤 `node emails/i18n-build.mjs` 로 다시 만드는 편이 안전합니다(ko 렌더가 원본과 같은지,
  en/zh 렌더에 한글이 없는지 자가 검증합니다). 그 뒤 `copy-helper.html` 도 같이 갱신됩니다(SKILL.md 참고).
- 초대 메일(05)은 운영자가 보내므로 수신자 locale 이 없어 한국어로 갑니다 — `inviteUserByEmail` 의 `data.locale` 로 넘기면 분기됩니다.
- 대시보드 **Subject** 는 분기가 안 되므로 위 표처럼 세 언어를 병기합니다.

## 디자인 톤

- 모노톤 + 핑크 포인트 (Luby AI 브랜드)
- 라이트 + 다크모드 자동 전환 (Apple Mail / iOS Mail)
- 가로 최대 560px (모바일 친화)
- 시스템 폰트 폴백 (Pretendard 미로드 시 Apple SD Gothic Neo)
- 인라인 CSS only — Gmail/Outlook 호환

## 변수 (Supabase가 자동 치환)

| 변수 | 의미 |
|---|---|
| `{{ .ConfirmationURL }}` | 인증/링크 URL — 버튼·텍스트 링크에서 사용 |
| `{{ .Email }}` | 받는 사람 이메일 |
| `{{ .NewEmail }}` | (이메일 변경 전용) 새 이메일 |
| `{{ .SiteURL }}` | 사이트 URL (수동 사용 시) |
| `{{ .Token }}` | 6자리 OTP (사용 시) |

## 테스트 방법

1. **회원가입 확인 메일**: https://luby.im/signup 에서 가입 → 받은 메일 확인
2. **매직링크**: `/login` 또는 코드로 트리거
3. **비밀번호 재설정**: `/login` → 비밀번호 찾기 (구현 필요 시)
4. **초대**: Supabase 대시보드 → Authentication → Users → **Invite User** 버튼
5. **이메일 변경**: 대시보드 설정에서 이메일 수정 시 발송

## Custom SMTP (Resend) 설정 — 운영 필수

기본 Supabase SMTP는 **시간당 4통**(개발용)이라 실서비스에선 반드시 Resend로 교체합니다.
Resend 도메인(luby.im) 인증은 이미 완료된 상태입니다.

1. https://supabase.com/dashboard/project/ncyuljyeyuorgsfuzzmw/settings/auth → **SMTP Settings**
2. **Enable Custom SMTP** 켜기
3. 아래 값 입력

| 항목 | 값 |
|---|---|
| Sender email | `notify@luby.im` |
| Sender name | `Luby AI` |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | Resend API 키 (`re_…`, 이미 Vercel에 등록한 것과 동일) |
| Minimum interval | `60` (초, 기본값 유지) |

4. **Save** → 같은 페이지 **Rate Limits** 에서 "Rate limit for sending emails" 를 `30`/h 이상으로 상향
5. https://luby.im/signup 에서 새 이메일로 가입해 인증 메일이 `Luby AI <notify@luby.im>` 로 오는지 확인

> 앱 알림 메일(캠페인 승인·정산 등)은 이미 `/api/notifications/email` → Resend 로 나가고 있고,
> 여기서 바꾸는 것은 **Supabase Auth 메일(가입 인증·비밀번호 재설정 등)** 발송 경로입니다.
