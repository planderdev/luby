/**
 * 알림 type → 이메일 카테고리. 이메일 수신 설정(profiles.email_prefs)의 키와 1:1.
 * - transactional: 내 캠페인·응모·정산 진행 상황 (기본 on, 끄면 중요한 진행 알림도 메일로 안 감)
 * - reminders:     리마인더·유도(첫 캠페인, 임시저장, 마감 임박, 프로필 완성 등) — 광고성 성격 → 수신 거부 수단 필수
 * - digest:        운영자 아침 다이제스트 · 광고주/크리에이터 주간 다이제스트
 */
export type EmailCategory = "transactional" | "reminders" | "digest";
export type EmailPrefs = Record<EmailCategory, boolean>;

export const DEFAULT_EMAIL_PREFS: EmailPrefs = { transactional: true, reminders: true, digest: true };

export const EMAIL_CATEGORY_LABEL: Record<EmailCategory, { label: string; desc: string }> = {
  transactional: { label: "진행 알림", desc: "캠페인 승인·응모·선정·콘텐츠 검수·정산 등 내 활동의 진행 상황" },
  reminders: { label: "리마인더 · 추천", desc: "첫 캠페인 만들기, 임시저장 이어하기, 마감 임박 캠페인, 프로필 완성 안내" },
  digest: { label: "다이제스트", desc: "매주 월요일 — 광고주: 지난주 캠페인 성과 · 크리에이터: 내 분야 새 캠페인·응모 현황·적립 · 운영자: 아침 처리 대기 업무" },
};

const REMINDER_TYPES = new Set([
  "nudge_first_campaign", "nudge_draft_campaign", "nudge_select_applicants", "nudge_submit_content",
  "nudge_review_submission", "nudge_complete_profile", "closing_soon_for_you", "welcome", "subscription_expiring",
]);
const DIGEST_TYPES = new Set(["operator_daily_digest", "advertiser_weekly_digest", "creator_weekly_digest"]);

export function categoryOf(type: string | null | undefined): EmailCategory {
  if (!type) return "transactional";
  if (DIGEST_TYPES.has(type)) return "digest";
  if (REMINDER_TYPES.has(type) || type.startsWith("nudge_")) return "reminders";
  return "transactional";
}

export function normalizePrefs(raw: unknown): EmailPrefs {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    transactional: r.transactional !== false,
    reminders: r.reminders !== false,
    digest: r.digest !== false,
  };
}
