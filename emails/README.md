# 루비AI 이메일 템플릿

Supabase Auth 가 보내는 5종 트랜잭션 이메일을 루비AI 브랜드에 맞춰 디자인한 HTML 템플릿입니다.

## 파일 구조

| 파일 | 용도 | Supabase 매핑 |
|---|---|---|
| `01-confirm-signup.html` | 회원가입 시 이메일 인증 | **Confirm signup** |
| `02-magic-link.html` | 비밀번호 없이 매직링크 로그인 | **Magic Link** |
| `03-reset-password.html` | 비밀번호 재설정 | **Reset Password** |
| `04-change-email.html` | 이메일 주소 변경 확인 | **Change Email Address** |
| `05-invite-user.html` | 운영자가 사용자 초대 | **Invite user** |
| `_partials/wrapper.html` | (참고용) 공유 래퍼 — 직접 사용 X | — |

## Supabase 대시보드에 적용하기

1. **Auth → Email Templates** 열기
   https://supabase.com/dashboard/project/ncyuljyeyuorgsfuzzmw/auth/templates

2. 각 템플릿에 대해 좌측에서 종류 선택 후:
   - **Subject** 필드에 아래 제목 입력
   - **Message Body (HTML)** 에 해당 HTML 파일 내용 전체 복붙
   - **Save** 클릭

## 제목 (Subject) 모음

| 템플릿 | 제목 (복붙용) |
|---|---|
| Confirm signup | `루비AI 이메일 인증 — 가입을 완료해주세요` |
| Magic Link | `루비AI 로그인 링크가 도착했어요` |
| Reset Password | `루비AI 비밀번호 재설정 안내` |
| Change Email Address | `루비AI 이메일 변경 확인` |
| Invite user | `루비AI에 초대되었어요` |

## 디자인 톤

- 모노톤 + 핑크 포인트 (루비AI 브랜드)
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

## ⚠️ Supabase 무료 SMTP 제한

기본 SMTP는 **시간당 4통** 까지만 발송됩니다 (개발/테스트용).
운영 시에는 **Custom SMTP** 설정 권장 (Resend / SendGrid 등).

Resend 연동 시: `hello@luby.im` 같은 도메인 발송자 사용 가능 + 무료 3,000통/월.
