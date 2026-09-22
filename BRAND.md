# 루비AI 브랜드 — 단일 소스 (BRAND.md)

배너·상세페이지·PPT·에셋·새 화면을 만들 때 이 문서의 값만 쓴다. 새 색·폰트를 임의로 추가하지 않는다(필요하면 "확장 제안"으로 구분해 보고).
전체 가이드 페이지: `design-system/index.html` → https://luby.im/design-system (Artifact 사본은 메모리 참조).

## 이름·표기
- 한글 **루비AI**(붙여 씀) · 영문 **Luby AI** · 워드마크/UI 짧은 표기 **Luby** · 도메인 luby.im (ko · /en · /zh)
- 슬로건: 체험단 모집·글로벌 인플루언서 마케팅 플랫폼
- 한 줄 설명: 루비AI는 글로벌 인플루언서·체험단을 AI로 매칭하는 마케팅 플랫폼입니다. 캠페인 등록부터 선정·콘텐츠 발행까지 한 곳에서.
- 운영사: 주식회사 플랜더 (Plander Corp.) · 대표 이동욱 · 제주시 관덕로 44 · contact@plander.io · 발신 notify@luby.im
- 금지: "루비" 단독 호칭, 본문 전부 대문자 LUBY, 레드로 강조한 "루비", 띄어쓴 "루비 AI"(SEO 키워드에만 허용)

## 로고
- 심볼("L" + 스파클) + 워드마크 "Luby" 락업. 항상 단색: 어두운 면엔 흰색, 밝은 면엔 잉크(#151217). 핑크 면엔 흰색만.
- 에셋: `public/logo.png`(흰 락업 1298×410, 라이트에선 `invert`), `app/icon.png`(심볼 512), `public/lre/svg/logo.svg`(벡터)
- 여백 심볼 높이 ½ 이상, 최소 워드마크 20px/6mm, 심볼 24px. 색 로고·그라데이션·비율 변경·회전·외곽선·스파클 제거 금지.

## 컬러 원칙
모노톤이 기본 · 핑크는 절제(태그·체크·언더라인·글로우·도트·핵심 CTA 하나) · 레드 금지 · "흰 면은 올라온 것, 회색은 들어간 것".

### 프로덕트(앱) — `app/globals.css`, Tailwind `rgb(var(--x) / a)`
| 토큰 | 라이트 | 다크 | 용도 |
|---|---|---|---|
| canvas | #FAF9FB | #050505 | 페이지 바탕 |
| background | #FFFFFF | #050505 | 올라온 면(카드·사이드바·인풋) |
| foreground | #151217 | #FFFFFF | 잉크·인버트 카드 |
| muted | #F3F0F5 | #111113 | 인셋(배너·빈 상태)에만 |
| muted-foreground | #6B6472 | #9E9EA8 | 보조 텍스트 |
| border | #EBE6EF | #2A2A32 | 헤어라인 |
| **accent** | **#FF2AA7** | #FF2AA7 | 네온 핑크 — CTA·포커스·글로우 |
| accent-strong | #E30080 | #E30080 | 흰 글자 얹는 핑크 면(AA 4.59:1) |
| accent-soft | #FFE5F4 | #4A001F | 핑크 배너·아이콘 배경 |
| accent-ink | #BC006F | #FF8ED5 | 핑크 텍스트 |
| success / soft | #087A45 / #D1FAE5 | #62FFAE / #062C1A | |
| warning / soft | #7A5300 / #FEF3C7 | #FFC83D / #332606 | |
| danger / soft | #A31842 / #FFE4EC | #FF547E / #3D0C1A | 로즈 — 핑크와 구분 |

### 마케팅(랜딩) — 리뉴얼 시안 `tokens.css`
void #080807 · ink #11100E · paper #F3F5F0 · paper-soft #E4E9E4 · text #F7F8F2 · text-muted #A6AAA4 · text-dark #161412 · **accent #E62485** · accent-dark #9B1557 · accent-soft #FF8FC9 · cyan #12C7D8 · yellow #F2D64B · line rgba(247,248,242,.22) · overlay rgba(8,8,7,.44)
- 두 표면의 핑크를 한 화면에 섞지 않는다. (확장 제안: 랜딩 #E62485 → 앱 accent-strong #E30080 로 수렴)

## 타이포
- 앱: **Pretendard Variable**(npm 동적 서브셋 셀프호스팅). 디스플레이 letter-spacing −0.02em · line-height 0.98, 본문 14–16px/1.65, 라벨 12px 500, 오버라인 11px 700 대문자 +0.1em, 숫자 tabular-nums. 기능 ss01 ss02 cv01 cv02.
- 랜딩: **SUIT Variable**(한국어, jsDelivr) · **Raleway**(영문 디스플레이·아이브로, 700–800) · **Noto Sans SC**(중국어). 스케일 13·14·16·18·20·24·28·32·40·48·56·64·72·88, 섹션 제목 clamp(40, 5.4vw, 56)/700/1.2.

## 간격·라운드·그림자·모션
- 앱: 4pt 그리드, 카드 패딩 24/32, 섹션 40. `rounded-2xl` 16(인풋) · `rounded-3xl` 24(카드) · `rounded-full`(버튼·칩). glass: `0 1px 2px rgba(21,18,23,.04), 0 10px 28px -16px rgba(21,18,23,.12)`(라이트만). neon: `0 12px 34px rgba(255,42,167,.32)`. focus: `0 0 0 4px rgba(255,42,167,.14)` + 보더 rgba(255,42,167,.36). 모션 0.2s ease, 호버 −2px.
- 랜딩: space 8·16·24·32·40·48·56·64·72·80·96·120·160(섹션 상하 160). radius 8·16·24. duration .25/.45/.8/1.1s, ease-standard cubic-bezier(.22,1,.36,1), ease-sharp cubic-bezier(.83,0,.17,1). 컨테이너 1680/1760, 거터 16→32→48.

## 모티프
bg-grid(56px 격자 + 라디얼 마스크) · 핑크 라디얼 글로우(잉크 면 귀퉁이, 채도 ≤50%) · 인버트 카드(bg-foreground text-background) · pink-underline(0.18em, 88%) · 마키(플랫폼·국기 띠, 구분자만 핑크) · 랜딩 대형 타이포 크롭·풀스크린 영상.

## 아이콘·이미지
- 앱 아이콘 Lucide 단일 세트(stroke 1.8, 16/20px, currentColor). 강조는 accent-soft 원형 배경 + accent-ink. 플랫폼 로고는 각 사 공식 SVG 원형 그대로. 이모지는 카테고리 칩·국기(데이터 값)에만.
- 사진·영상은 랜딩만: 실사·자연광·영상 우선·대형 타이포 오버레이(딤 rgba(8,8,7,.44))·부유 3D 오브젝트(단색 금속). 앱 내부는 사진·일러스트 없음. 스톡 느낌·과채도·저작권 불명 이미지 금지.

## 컴포넌트 어휘(앱)
- 버튼: `btn-neon`(화면당 하나, 핵심 전환) → solid(잉크 필) → outline → ghost. 전부 rounded-full, 12/22px 패딩.
- 인풋: glass-card + rounded-2xl + 12/16px, 포커스 핑크 링, 필수 별표 accent-ink, 힌트 12px muted, 오류는 danger.
- 배너: accent-soft(안내) · success/warning/danger-soft. 칩: rounded-full, 선택 시 잉크 반전(최대 N개). 상태 뱃지: 승인됨(ok)·승인 대기(warn)·반려(danger)·게시 완료(ok)·추천(pink)·데모(ext).
- 탭 밑줄, 툴팁·토스트는 잉크 필, 캠페인 카드(rounded-3xl, 썸네일+제목+메타+포인트), 지표 타일(muted 인셋 + tabular 큰 숫자 + 핑크 진행 바).

## 톤 앤 보이스
UI 존댓말 "~해요" · 마케팅 선언형 단문 · 숫자는 근거와 함께 · 과장 형용사·화려한 그래픽 지양. 키 메시지: "언어와 시장의 장벽을 AI로 낮추다" · "새로운 시장 진출, 복잡할 필요 없습니다" · "전 세계 체험단을, 한 번의 캠페인으로."

_v1.0 · 2026-09-22 · 원천: app/globals.css, luby-re tokens.css, 디자인 언어 결정 기록(2026-08-20 라이트 B안)_
