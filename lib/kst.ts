/**
 * 날짜·시간은 한국 시간(KST, UTC+9)이 기준이다 (2026-11-23).
 *
 * 화면 표시 — 서버(Vercel)는 UTC, 브라우저는 사용자 시간대로 계산한다. 그대로 두면 한국 시간 00~09시 값이
 * 서버 렌더에서 하루 앞 날짜로 찍히고, 클라이언트 컴포넌트는 서버·브라우저 결과가 달라 하이드레이션 오류(#418)가 난다.
 * toLocaleDateString·toLocaleString 에는 { timeZone: "Asia/Seoul" } 를 넘기고,
 * getMonth()·getDate()·getHours() 같은 지역 시간 게터 대신 kstParts 를 쓴다.
 *
 * 입력·저장 — 캠페인 일정(모집·체험 시작/종료)과 공지 게시 기간의 datetime-local 값(예: 11/29 23:59)은
 * 한국 시간으로 해석해 저장한다(kstInputToIso). 수정 화면에 되돌려 채울 때는 kstInputValue.
 * 예전에는 이 값을 시간대 없이 UTC 로 저장해 마감이 9시간 늦게 처리됐다 — 2026-11-23 기존 데이터를 옮겼다.
 */
const KST_OFFSET_MS = 9 * 60 * 60 * 1000; // 한국은 서머타임이 없어 UTC+9 고정

export function kstParts(input: string | number | Date) {
  const d = new Date(new Date(input).getTime() + KST_OFFSET_MS);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hours: d.getUTCHours(),
    minutes: d.getUTCMinutes(),
  };
}

const p2 = (n: number) => String(n).padStart(2, "0");

/** 한국 시간 날짜 값(YYYY-MM-DD) — date 입력·보고서 기간 기본값용 */
export function kstDateValue(input: string | number | Date) {
  const k = kstParts(input);
  return `${k.year}-${p2(k.month)}-${p2(k.day)}`;
}

/** 한국 시간 datetime-local 값(YYYY-MM-DDTHH:mm) — 수정 화면에 저장된 시각을 되돌려 채울 때 */
export function kstInputValue(input: string | number | Date) {
  const k = kstParts(input);
  return `${kstDateValue(input)}T${p2(k.hours)}:${p2(k.minutes)}`;
}

/**
 * 작성 화면 값(datetime-local·date)을 한국 시간으로 해석해 ISO(UTC) 문자열로 바꾼다.
 * 이미 시간대가 붙은 값(Z, +09:00 등)은 그대로 해석한다. 비었거나 잘못된 값은 null.
 */
export function kstInputToIso(v: string | null | undefined): string | null {
  const raw = (v ?? "").trim();
  if (!raw) return null;
  let s = raw;
  if (!/(Z|[+-]\d{2}:?\d{2})$/i.test(raw)) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) s = `${raw}T00:00:00+09:00`;
    else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw)) s = `${raw}:00+09:00`;
    else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(raw)) s = `${raw}+09:00`;
    else return null;
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
