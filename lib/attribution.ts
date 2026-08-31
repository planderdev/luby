"use client";

/**
 * 가입 경로(첫 터치) 추적 — 어느 채널에서 온 방문이 가입으로 이어졌는지.
 *
 * 2026-08-29 하루 63명 유입의 출처를 알 수 없었다. 공개 페이지에 처음 도착했을 때
 * UTM·유입원·랜딩 경로를 localStorage 에 한 번 저장하고(첫 터치 유지), 가입 시
 * 메타데이터로 실어 보내면 DB 트리거가 profiles.signup_source 에 기록한다.
 */

export type Attribution = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  referrer?: string;
  landing?: string;
  captured_at?: string;
};

const KEY = "luby:first-touch";
const MAX_AGE_MS = 30 * 24 * 3600_000; // 30일 지난 첫 터치는 새 방문으로 본다
const trim = (v: string | null | undefined, n = 200) => (v ? v.slice(0, n) : undefined);

/** 공개 페이지 도착 시 1회 호출 — 이미 저장된 첫 터치가 있으면 덮지 않는다 */
export function captureAttribution(): void {
  try {
    const prev = localStorage.getItem(KEY);
    if (prev) {
      const at = (JSON.parse(prev) as Attribution).captured_at;
      if (at && Date.now() - new Date(at).getTime() < MAX_AGE_MS) return;
    }
    const q = new URLSearchParams(window.location.search);
    const ref = document.referrer && !document.referrer.includes(window.location.host) ? document.referrer : "";
    const a: Attribution = {
      utm_source: trim(q.get("utm_source"), 80),
      utm_medium: trim(q.get("utm_medium"), 80),
      utm_campaign: trim(q.get("utm_campaign"), 120),
      referrer: trim(ref),
      landing: trim(window.location.pathname + window.location.search),
      captured_at: new Date().toISOString(),
    };
    // 아무 신호도 없으면(직접 방문·내부 이동) 저장하지 않는다 — "(직접)"은 부재로 표현
    if (!a.utm_source && !a.referrer) return;
    localStorage.setItem(KEY, JSON.stringify(a));
  } catch {
    /* 시크릿 모드 등 저장 불가는 무시 */
  }
}

/** 가입 시 메타데이터에 실을 첫 터치 (없으면 null) */
export function readAttribution(): Attribution | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const a = JSON.parse(raw) as Attribution;
    return a && typeof a === "object" ? a : null;
  } catch {
    return null;
  }
}
