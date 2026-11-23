/**
 * 화면에 찍는 날짜·시간은 한국 시간(KST)으로 고정한다 (2026-11-23).
 *
 * 서버(Vercel)는 UTC, 브라우저는 사용자 시간대로 계산한다. 그대로 두면 한국 시간 00~09시 값이 서버 렌더에서
 * 하루 앞 날짜로 찍히고, 클라이언트 컴포넌트는 서버·브라우저 결과가 달라 하이드레이션 오류(#418)가 난다.
 * toLocaleDateString·toLocaleString 에는 { timeZone: "Asia/Seoul" } 를 넘기고,
 * getMonth()·getDate()·getHours() 같은 지역 시간 게터 대신 kstParts 를 쓴다.
 *
 * 예외 — 캠페인 일정(모집·체험 시작/종료)과 공지 게시 기간은 작성 화면의 datetime-local 값(예: 11/29 23:59)을
 * 시간대 없이 UTC 로 저장한다(campaigns/[id]/edit·notices/actions.ts toIso 와 같은 규칙). 이 값들은
 * timeZone: "UTC"(또는 scheduleParts)로 찍어야 광고주·운영자가 입력한 날짜·시각 그대로 보인다.
 */
export function kstParts(input: string | number | Date) {
  // 한국은 서머타임이 없어 UTC+9 고정
  const d = new Date(new Date(input).getTime() + 9 * 60 * 60 * 1000);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hours: d.getUTCHours(),
    minutes: d.getUTCMinutes(),
  };
}

/** 캠페인 일정·공지 기간용 — 입력한 벽시계 값 그대로 (위 '예외' 참고) */
export function scheduleParts(input: string | number | Date) {
  const d = new Date(input);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hours: d.getUTCHours(),
    minutes: d.getUTCMinutes(),
  };
}
