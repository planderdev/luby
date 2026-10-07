/**
 * 알림 문구 현지화 (2026-10-07, 앱 다국어 5단계).
 *
 * 알림 제목·본문은 DB 함수(push_notification 호출부)가 한국어로 만든다. 영문·중문 크리에이터에게는
 * 발송(이메일·푸시)·표시(알림 페이지·벨 토스트) 시점에 이 모듈이 알려진 type 의 한국어 템플릿을
 * 정규식으로 되읽어 같은 뜻의 en/zh 문장으로 바꾼다. 모르는 type·형식이면 원문(한국어) 그대로.
 * 캠페인 제목·상호·메시지 본문 같은 데이터는 그대로 둔다. 순수 함수 — 클라이언트에서도 쓴다.
 *
 * 한국어 템플릿을 DB 에서 바꾸면 여기 정규식도 같이 고칠 것 (검증: scripts/.local/smoke-notification-i18n.mts).
 */
import type { Locale } from "@/lib/i18n/config";

export type NotificationLike = { type?: string | null; title: string; body?: string | null };
type L = "en" | "zh";
type Render = (m: string[]) => string;
type Rule = { re: RegExp; en: Render; zh: Render };

function apply(rules: Rule[], text: string, locale: L): string | null {
  for (const r of rules) {
    const m = text.match(r.re);
    if (m) return r[locale](m);
  }
  return null;
}

const TITLE: Record<string, Rule[]> = {
  welcome: [{ re: /^가입을 환영해요 🎉$/, en: () => "Welcome to Luby AI 🎉", zh: () => "欢迎加入 Luby AI 🎉" }],
  nudge_register_channel: [{ re: /^승인을 받으려면 채널 등록이 필요해요$/, en: () => "Add a channel to get approved", zh: () => "登记频道才能通过审核" }],
  nudge_complete_profile: [{ re: /^프로필을 채우면 추천이 시작돼요$/, en: () => "Complete your profile to start getting recommendations", zh: () => "完善资料即可开始获得推荐" }],
  account_approved: [{ re: /^크리에이터 계정이 승인되었어요 🎉$/, en: () => "Your creator account is approved 🎉", zh: () => "您的体验官账号已通过审核 🎉" }],
  application_selected: [
    { re: /^체험단에 선정되었어요! 🎉$/, en: () => "You've been selected! 🎉", zh: () => "您已入选！🎉" },
    { re: /^체험단에 배정되었어요! 🎉$/, en: () => "You've been assigned to a campaign! 🎉", zh: () => "您已被分配到活动！🎉" },
  ],
  application_rejected: [{ re: /^아쉽지만 다음 기회에$/, en: () => "Not selected this time", zh: () => "很遗憾，期待下次机会" }],
  campaign_invited: [{ re: /^(.+)님이 캠페인에 초대했어요$/, en: (m) => `${m[1]} invited you to a campaign`, zh: (m) => `${m[1]} 邀请您参加活动` }],
  new_message: [{ re: /^(.+)님의 새 메시지$/, en: (m) => `New message from ${m[1]}`, zh: (m) => `${m[1]} 发来新消息` }],
  submission_approved: [{ re: /^콘텐츠 승인 · 포인트 지급 💰$/, en: () => "Content approved · points paid 💰", zh: () => "内容已通过 · 积分已发放 💰" }],
  submission_revision: [{ re: /^콘텐츠 수정 요청$/, en: () => "Revision requested", zh: () => "内容需要修改" }],
  campaign_cancelled: [{ re: /^캠페인이 취소되었어요$/, en: () => "A campaign was cancelled", zh: () => "活动已取消" }],
  withdrawal_paid: [{ re: /^출금이 완료되었어요 🎉$/, en: () => "Your withdrawal is complete 🎉", zh: () => "提现已完成 🎉" }],
  withdrawal_rejected: [{ re: /^출금 신청이 반려되었어요$/, en: () => "Your withdrawal was rejected", zh: () => "提现申请被拒" }],
  referral_reward: [{ re: /^추천 보상 (\d+)P가 지급되었어요 🎁$/, en: (m) => `Referral reward: ${m[1]}P paid 🎁`, zh: (m) => `推荐奖励 ${m[1]}P 已发放 🎁` }],
  new_campaign_for_you: [{ re: /^내 분야 새 캠페인이 열렸어요$/, en: () => "A new campaign in your field just opened", zh: () => "您领域的新活动上线了" }],
  closing_soon_for_you: [
    { re: /^내 분야 캠페인이 곧 마감돼요$/, en: () => "A campaign in your field closes soon", zh: () => "您领域的活动即将截止" },
    { re: /^내 분야 캠페인 (\d+)개가 곧 마감돼요$/, en: (m) => `${m[1]} campaigns in your field close soon`, zh: (m) => `您领域的 ${m[1]} 个活动即将截止` },
  ],
  nudge_submit_content: [{ re: /^콘텐츠 제출을 잊지 않으셨죠\?$/, en: () => "Don't forget to submit your content", zh: () => "别忘了提交内容" }],
  confirm_email_reminder: [{ re: /^이메일 인증을 마치면 바로 시작할 수 있어요$/, en: () => "Confirm your email to get started", zh: () => "完成邮箱验证即可开始" }],
  creator_weekly_digest: [
    { re: /^지난주 승인 (\d+)건 · \+(\d+)P 적립$/, en: (m) => `${m[1]} approved last week · +${m[2]}P earned`, zh: (m) => `上周通过 ${m[1]} 条 · 获得 +${m[2]}P` },
    { re: /^선정된 캠페인 (\d+)개, 콘텐츠 제출을 기다리고 있어요$/, en: (m) => `${m[1]} selected campaign${m[1] === "1" ? " is" : "s are"} waiting for your content`, zh: (m) => `${m[1]} 个已入选活动等待您提交内容` },
    { re: /^내 분야 새 캠페인 (\d+)개 — 지금 응모해 보세요$/, en: (m) => `${m[1]} new campaign${m[1] === "1" ? "" : "s"} in your field — apply now`, zh: (m) => `您领域有 ${m[1]} 个新活动 — 立即报名` },
    { re: /^지난주 내 프로필을 (\d+)번 봤어요$/, en: (m) => `Your profile was viewed ${m[1]} time${m[1] === "1" ? "" : "s"} last week`, zh: (m) => `上周您的资料被浏览 ${m[1]} 次` },
    { re: /^이번 주 루비AI 소식$/, en: () => "This week on Luby AI", zh: () => "本周 Luby AI 动态" },
  ],
};

const BODY: Record<string, Rule[]> = {
  welcome: [{ re: /^운영자가 프로필을 검수하고 있어요\(보통 24시간 이내\)\. 그동안 설정에서 채널과 전문 분야를 채워두면 승인 즉시 맞춤 캠페인 추천이 시작됩니다\.$/,
    en: () => "Our team is reviewing your profile (usually within 24 hours). Meanwhile, add your channels and specialties in Settings so personalized recommendations start the moment you're approved.",
    zh: () => "运营团队正在审核您的资料（通常 24 小时内）。期间请在设置中登记频道和擅长领域，审核通过后即可立即收到个性化活动推荐。" }],
  nudge_register_channel: [{ re: /^운영자 승인은 SNS 채널\(인스타그램·유튜브·블로그 등\)을 검수해 진행돼요\. 채널을 등록하시면 검수가 시작되고 보통 24시간 안에 승인됩니다\.$/,
    en: () => "Approval is based on reviewing your social channel (Instagram, YouTube, blog…). Once you add one, the review starts and is usually done within 24 hours.",
    zh: () => "运营审核以社交频道（Instagram、YouTube、博客等）为依据。登记频道后即开始审核，通常 24 小时内批准。" }],
  nudge_complete_profile: [
    { re: /^아직 채널이 등록되지 않았어요\. 채널\(인스타·유튜브·블로그 등\)을 등록하면 광고주 검색과 AI 매칭에 노출됩니다\.$/,
      en: () => "You haven't added a channel yet. Add one (Instagram, YouTube, blog…) to appear in advertiser searches and AI matching.",
      zh: () => "您还没有登记频道。登记频道（Instagram、YouTube、博客等）后才能出现在广告主搜索和 AI 匹配中。" },
    { re: /^전문 분야를 선택하면 내 업종에 맞는 캠페인이 우선 추천되고 광고주 초대도 늘어나요\.$/,
      en: () => "Choose your specialties to get campaigns in your field recommended first and receive more advertiser invitations.",
      zh: () => "选择擅长领域后，您行业的活动会优先推荐，广告主邀请也会增加。" },
  ],
  account_approved: [{ re: /^이제 캠페인에 응모하고 광고주 초대를 받을 수 있어요\. 설정에서 전문 분야와 채널을 채워두면 더 많은 기회가 찾아옵니다\.$/,
    en: () => "You can now apply to campaigns and receive advertiser invitations. Fill in your specialties and channels in Settings to get more opportunities.",
    zh: () => "现在您可以报名活动并接收广告主邀请。在设置中完善擅长领域和频道，机会会更多。" }],
  application_selected: [
    { re: /^(.+) 캠페인에 운영자 배정으로 선정되었습니다\. 체험 후 콘텐츠를 제출해주세요\.$/, en: (m) => `You were assigned to "${m[1]}" by the operator. Submit your content after the experience.`, zh: (m) => `运营团队已将您分配到「${m[1]}」。体验后请提交内容。` },
    { re: /^(.+) 캠페인에 선정되었습니다\. 체험 후 콘텐츠를 제출해주세요\.$/, en: (m) => `You were selected for "${m[1]}". Submit your content after the experience.`, zh: (m) => `您已入选「${m[1]}」。体验后请提交内容。` },
  ],
  application_rejected: [{ re: /^(.+) 캠페인에 선정되지 않았습니다\. 다른 캠페인에 도전해보세요!$/, en: (m) => `You weren't selected for "${m[1]}". Try another campaign!`, zh: (m) => `您未入选「${m[1]}」。试试其他活动吧！` }],
  campaign_invited: [{ re: /^\[(.+)\] 초대를 확인하고 수락하면 바로 응모돼요\.$/, en: (m) => `[${m[1]}] Review the invitation — accepting applies you instantly.`, zh: (m) => `[${m[1]}] 查看邀请，接受后立即完成报名。` }],
  submission_approved: [{ re: /^(.+) 콘텐츠가 승인되어 (\d+)P가 지급되었습니다\.$/, en: (m) => `Your content for "${m[1]}" was approved and ${m[2]}P has been paid.`, zh: (m) => `「${m[1]}」的内容已通过，${m[2]}P 已发放。` }],
  submission_revision: [{ re: /^(.+) 콘텐츠에 수정 요청이 있습니다\. 확인 후 재제출해주세요\.$/, en: (m) => `Revision requested for your "${m[1]}" content. Check the feedback and resubmit.`, zh: (m) => `「${m[1]}」的内容收到修改请求，请查看后重新提交。` }],
  campaign_cancelled: [{ re: /^(.+) 캠페인이 광고주 사정으로 취소되었습니다\.( 진행 중이던 활동이 있다면 광고주에게 메시지로 문의해 주세요\.)?$/,
    en: (m) => `"${m[1]}" was cancelled by the advertiser.${m[2] ? " If you had work in progress, message the advertiser." : ""}`,
    zh: (m) => `「${m[1]}」已因广告主原因取消。${m[2] ? "如有进行中的活动，请通过消息联系广告主。" : ""}` }],
  withdrawal_paid: [{ re: /^(\d+)P\((\d+)원\)가 (.+) 계좌로 지급되었습니다\.$/, en: (m) => `${m[1]}P (₩${m[2]}) was paid to your ${m[3]} account.`, zh: (m) => `${m[1]}P（${m[2]} 韩元）已打款至您的 ${m[3]} 账户。` }],
  withdrawal_rejected: [
    { re: /^사유: (.+)\. 포인트는 환불되었습니다\.$/, en: (m) => `Reason: ${m[1]}. Your points have been refunded.`, zh: (m) => `原因：${m[1]}。积分已退回。` },
    { re: /^포인트는 환불되었습니다\.$/, en: () => "Your points have been refunded.", zh: () => "积分已退回。" },
  ],
  referral_reward: [{ re: /^내가 초대한 (.+)님이 첫 체험\((.*)\)을 완료했어요\. 포인트 내역에서 확인하세요\.$/, en: (m) => `${m[1]}, whom you invited, completed their first campaign (${m[2]}). See your point history.`, zh: (m) => `您邀请的 ${m[1]} 完成了首次体验（${m[2]}）。请在积分明细中查看。` }],
  new_campaign_for_you: [{ re: /^"(.*)" · (.+) · (\d+)P · (\d+)명 모집 — 먼저 응모할수록 선정에 유리해요\.$/, en: (m) => `"${m[1]}" · ${m[2]} · ${m[3]}P · recruiting ${m[4]} — the earlier you apply, the better your odds.`, zh: (m) => `"${m[1]}" · ${m[2]} · ${m[3]}P · 招募 ${m[4]} 人 — 越早报名越有机会入选。` }],
  closing_soon_for_you: [{ re: /^"(.*)"( 외 (\d+)개)? — 48시간 안에 모집이 끝나요\. 놓치기 전에 응모해 보세요\.$/, en: (m) => `"${m[1]}"${m[3] ? ` and ${m[3]} more` : ""} — recruiting ends within 48 hours. Apply before it closes.`, zh: (m) => `"${m[1]}"${m[3] ? ` 等 ${Number(m[3]) + 1} 个` : ""} — 48 小时内截止招募，别错过报名。` }],
  nudge_submit_content: [{ re: /^"(.*)" 캠페인에 선정되셨어요\. 콘텐츠 URL을 제출하면 검수 후 (\d+)P가 지급됩니다\.$/, en: (m) => `You were selected for "${m[1]}". Submit your content URL and ${m[2]}P is paid after review.`, zh: (m) => `您已入选「${m[1]}」。提交内容链接，审核后发放 ${m[2]}P。` }],
  confirm_email_reminder: [{ re: /^가입 때 받은 메일의 인증 링크를 눌러 주세요\. 인증 메일을 다시 보내 드렸어요\.$/, en: () => "Click the confirmation link in the email you received at signup. We've sent it again.", zh: () => "请点击注册时收到邮件中的验证链接。我们已重新发送验证邮件。" }],
};

/** 주간 다이제스트 본문 항목(' · ' 구분) 별 변환 */
const DIGEST_ITEM: Rule[] = [
  { re: /^내 분야·지역 새 캠페인 (\d+)개\("(.*)"( 외)?\)$/, en: (m) => `${m[1]} new campaign${m[1] === "1" ? "" : "s"} in your field/region ("${m[2]}"${m[3] ? " and more" : ""})`, zh: (m) => `您领域·地区的新活动 ${m[1]} 个（"${m[2]}"${m[3] ? " 等" : ""}）` },
  { re: /^이번 주 마감 (\d+)개$/, en: (m) => `${m[1]} closing this week`, zh: (m) => `本周截止 ${m[1]} 个` },
  { re: /^응모 대기 (\d+)건$/, en: (m) => `${m[1]} application${m[1] === "1" ? "" : "s"} pending`, zh: (m) => `报名待定 ${m[1]} 个` },
  { re: /^제출 필요 (\d+)건 — 선정됐어요$/, en: (m) => `${m[1]} selected — content due`, zh: (m) => `已入选 ${m[1]} 个 — 待提交内容` },
  { re: /^검수 대기 (\d+)건$/, en: (m) => `${m[1]} awaiting review`, zh: (m) => `审核中 ${m[1]} 条` },
  { re: /^지난주 승인 (\d+)건 \(\+(\d+)P\)$/, en: (m) => `${m[1]} approved last week (+${m[2]}P)`, zh: (m) => `上周通过 ${m[1]} 条（+${m[2]}P）` },
  { re: /^내 프로필 조회 (\d+)회( \(QR 명함 (\d+)\))?$/, en: (m) => `${m[1]} profile view${m[1] === "1" ? "" : "s"}${m[3] ? ` (QR card ${m[3]})` : ""}`, zh: (m) => `资料浏览 ${m[1]} 次${m[3] ? `（QR 名片 ${m[3]}）` : ""}` },
  { re: /^보유 (\d+)P( — 출금 가능)?$/, en: (m) => `Balance ${m[1]}P${m[2] ? " — withdrawal available" : ""}`, zh: (m) => `可用积分 ${m[1]}P${m[2] ? " — 可提现" : ""}` },
];

/** 알림 한 건을 화면 언어로. ko 또는 모르는 형식이면 입력 그대로 */
export function localizeNotification<T extends NotificationLike>(n: T, locale: Locale): T {
  if (locale === "ko") return n;
  const type = n.type ?? "";
  const title = apply(TITLE[type] ?? [], n.title, locale) ?? n.title;
  let body: string | null | undefined = n.body;
  if (n.body) {
    if (type === "creator_weekly_digest") {
      body = n.body.split(" · ").map((item) => apply(DIGEST_ITEM, item.trim(), locale) ?? item.trim()).join(" · ");
    } else {
      body = apply(BODY[type] ?? [], n.body, locale) ?? n.body;
    }
  }
  return { ...n, title, body };
}
