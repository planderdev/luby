/**
 * 채널 인증 반려 사유 — 운영자 화면의 빠른 선택 버튼. 이 문장 그대로면 영문·중문 크리에이터 알림에서 번역된다(lib/notifications/localize.ts).
 * 직접 쓴 사유는 원문(한국어) 그대로 간다.
 */
export const CHANNEL_REJECT_REASONS: { ko: string; en: string; zh: string }[] = [
  { ko: "캡처에 인증 코드가 안 보여요", en: "The verification code isn't visible in the screenshot", zh: "截图中看不到认证码" },
  { ko: "캡처의 팔로워 수가 입력한 숫자와 달라요", en: "The follower count in the screenshot doesn't match what you entered", zh: "截图中的粉丝数与填写的数字不一致" },
  { ko: "등록한 채널과 캡처의 계정이 달라요", en: "The account in the screenshot doesn't match the registered channel", zh: "截图中的账号与登记的频道不一致" },
  { ko: "캡처가 흐려서 읽을 수 없어요", en: "The screenshot is too blurry to read", zh: "截图太模糊，无法辨认" },
];

export function translateRejectReason(ko: string, locale: "en" | "zh"): string {
  return CHANNEL_REJECT_REASONS.find((r) => r.ko === ko.trim())?.[locale] ?? ko;
}
