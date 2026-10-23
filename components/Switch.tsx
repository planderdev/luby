"use client";

/**
 * 켜기/끄기 스위치 — 설정의 이메일 알림·공개 프로필 등 공용.
 * 손잡이는 흐름 안에 두고(트랙 p-0.5 + items-center) 켜질 때만 translate 로 옮겨, 트랙 밖으로 튀어나가지 않는다.
 * (2026-10-23: absolute 손잡이에 left 가 없어 버튼 가운데 기준으로 밀려나던 문제 교정)
 */
export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? "bg-accent" : "bg-muted ring-1 ring-inset ring-border"
      }`}
    >
      <span
        aria-hidden
        className={`size-5 rounded-full bg-white shadow-sm ring-1 ring-black/5 transition-transform ${checked ? "translate-x-5" : "translate-x-0"}`}
      />
    </button>
  );
}
