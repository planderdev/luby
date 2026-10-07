// 인증 메일 5종을 한·영·중 분기(Go template) 템플릿으로 변환 (2026-10-07). 원본 한국어 문구는 {{ else }} 가지에 그대로 남는다.
// 사용: node emails/i18n-build.mjs  → 같은 파일을 제자리에서 갱신하고, ko/en/zh 로 가상 렌더해 자가 검증한다.
import { readFileSync, writeFileSync } from "node:fs";
const DECL = `{{ $l := printf "%v" .Data.locale }}{{ if and (ne $l "en") (ne $l "zh") }}{{ $l = "ko" }}{{ end }}`;
const c = (ko, en, zh) => `{{ if eq $l "zh" }}${zh}{{ else if eq $l "en" }}${en}{{ else }}${ko}{{ end }}`;
const COMMON = [
  ["Luby AI · 글로벌 체험단 마케팅 플랫폼", "Luby AI · Global creator campaign platform", "Luby AI · 全球体验营销平台"],
  ["버튼이 작동하지 않으면 아래 링크를 복사해서 브라우저 주소창에 붙여넣어주세요.", "If the button doesn't work, copy the link below into your browser's address bar.", "如果按钮无法使用，请复制下方链接粘贴到浏览器地址栏。"],
  ["버튼이 작동하지 않으면 아래 링크를 복사해서 사용해주세요.", "If the button doesn't work, copy and open the link below.", "如果按钮无法使用，请复制下方链接打开。"],
];
const FILES = {
  "01-confirm-signup.html": [
    ["<title>Luby AI 이메일 인증</title>", "<title>Verify your email – Luby AI</title>", "<title>Luby AI 邮箱验证</title>"],
    ["환영합니다", "Welcome", "欢迎"],
    ["이메일을<br>인증해주세요", "Please verify<br>your email", "请验证<br>您的邮箱"],
    ["Luby AI에 가입해 주셔서 감사합니다.", "Thanks for joining Luby AI.", "感谢您注册 Luby AI。"],
    ["아래 버튼을 클릭하면 이메일 인증이 완료되고, 모든 기능을 사용하실 수 있어요.", "Click the button below to verify your email and unlock every feature.", "点击下方按钮完成邮箱验证，即可使用全部功能。"],
    ["이메일 인증하기 →", "Verify email →", "验证邮箱 →"],
    ["본인이 가입하지 않으셨다면 이 메일을 안전하게 무시해주세요.", "If you didn't sign up, you can safely ignore this email.", "如果不是您本人注册，请忽略此邮件。"],
    ["어떠한 계정도 생성되지 않습니다.", "No account will be created.", "不会创建任何账号。"],
  ],
  "02-magic-link.html": [
    ["<title>Luby AI 로그인</title>", "<title>Your login link – Luby AI</title>", "<title>Luby AI 登录链接</title>"],
    ["로그인 링크", "Login link", "登录链接"],
    ["한 번의 클릭으로<br>로그인하세요", "Log in with<br>one click", "一键<br>登录"],
    ["요청하신 매직 링크입니다. 아래 버튼을 누르면 비밀번호 없이 즉시 로그인됩니다.", "Here's the magic link you requested. Click the button to log in instantly without a password.", "这是您请求的登录链接。点击按钮即可免密码立即登录。"],
    ["이 링크는 1시간 동안 유효합니다.", "This link is valid for 1 hour.", "此链接 1 小时内有效。"],
    ["로그인 →", "Log in →", "登录 →"],
    ["본인이 요청하지 않으셨다면 누군가 이메일 주소를 잘못 입력했을 수 있습니다.", "If you didn't request this, someone may have entered your email by mistake.", "如果不是您本人请求，可能是他人误输入了您的邮箱。"],
    ["이 메일을 안전하게 무시해주세요.", "You can safely ignore this email.", "请忽略此邮件。"],
  ],
  "03-reset-password.html": [
    ["<title>Luby AI 비밀번호 재설정</title>", "<title>Reset your password – Luby AI</title>", "<title>Luby AI 重置密码</title>"],
    ["새 비밀번호를<br>설정하세요", "Set a new<br>password", "设置<br>新密码"],
    ["비밀번호 재설정 요청을 받았습니다.", "We received a request to reset your password.", "我们收到了重置密码的请求。"],
    ["아래 버튼을 클릭하시면 새 비밀번호를 안전하게 설정할 수 있어요.", "Click the button below to set a new password securely.", "点击下方按钮即可安全地设置新密码。"],
    ["비밀번호 재설정 →", "Reset password →", "重置密码 →"],
    ["보안 안내", "Security notice", "安全提示"],
    ["이 링크는 <strong>1시간 동안</strong> 유효합니다. 본인이 요청하지 않으셨다면 즉시 비밀번호를 변경하시고 ", "This link is valid for <strong>1 hour</strong>. If you didn't request it, change your password right away and contact ", "此链接 <strong>1 小时内</strong>有效。如果不是您本人请求，请立即修改密码并联系 "],
    ["본인이 비밀번호 재설정을 요청하지 않으셨다면 이 메일을 무시해주세요.", "If you didn't request a password reset, ignore this email.", "如果不是您本人请求重置密码，请忽略此邮件。"],
    ["현재 비밀번호는 변경되지 않습니다.", "Your current password stays unchanged.", "当前密码不会被更改。"],
    // 배지 텍스트 '비밀번호 재설정' 은 CTA 치환 뒤 남은 것만 (CTA 는 '비밀번호 재설정 →')
    ["비밀번호 재설정\n", "Password reset\n", "重置密码\n"],
  ],
  "04-change-email.html": [
    ["<title>Luby AI 이메일 변경</title>", "<title>Confirm your email change – Luby AI</title>", "<title>Luby AI 更改邮箱</title>"],
    ["이메일 변경을<br>확인해주세요", "Please confirm<br>your email change", "请确认<br>更改邮箱"],
    ["Luby AI 계정의 이메일 주소 변경 요청을 받았습니다.", "We received a request to change the email on your Luby AI account.", "我们收到了更改 Luby AI 账号邮箱的请求。"],
    ["아래 버튼을 클릭하시면 변경이 완료됩니다.", "Click the button below to complete the change.", "点击下方按钮即可完成更改。"],
    ["변경 전</p>", "Current</p>", "更改前</p>"],
    ["변경 후</p>", "New</p>", "更改后</p>"],
    ["변경 확인하기 →", "Confirm change →", "确认更改 →"],
    ["본인이 이메일 변경을 요청하지 않으셨다면 즉시", "If you didn't request this change, contact us right away at", "如果不是您本人请求更改，请立即联系"],
    ["이메일 변경\n", "Email change\n", "更改邮箱\n"],
  ],
  "05-invite-user.html": [
    ["<title>Luby AI 초대장</title>", "<title>You're invited to Luby AI</title>", "<title>Luby AI 邀请函</title>"],
    ["초대장 도착 🎉", "You're invited 🎉", "邀请函已送达 🎉"],
    ["Luby AI에<br>합류하세요", "Join<br>Luby AI", "加入<br>Luby AI"],
    [" 주소로 초대장이 도착했습니다.", " has been invited to Luby AI.", " 收到了 Luby AI 的邀请函。"],
    ["아래 버튼을 통해 가입을 완료하고 글로벌 체험단 마케팅을 시작해보세요.", "Complete your signup with the button below and start global creator marketing.", "点击下方按钮完成注册，开启全球体验营销。"],
    ["12개국 글로벌 인플루언서 풀", "Creator pool across 12 countries", "覆盖 12 个国家的创作者资源"],
    ["AI가 5분 안에 캠페인 작성", "AI drafts your campaign in 5 minutes", "AI 5 分钟生成活动方案"],
    ["응모자 자동 매칭 & 검증 시스템", "Automatic applicant matching & verification", "报名者自动匹配与审核"],
    ["초대 수락하기 →", "Accept invitation →", "接受邀请 →"],
    ["이 초대장은 본인을 위해 발송되었습니다. 의도하지 않은 메일이라면 무시해주세요.", "This invitation was sent for you. If it wasn't intended for you, please ignore it.", "此邀请函是发送给您本人的。如非您所需，请忽略。"],
  ],
};
// 앵커 뒤 ' 로 문의해주세요.' (03·04)
const CONTACT_TAIL = /(contact@plander\.io<\/a>) 로 문의해주세요\./g;

function render(tpl, locale) {
  // 자가 검증용 미니 렌더러: 선언부 제거, 분기 선택, {{ $l }} 치환
  let s = tpl.replace(DECL, "");
  s = s.replace(/\{\{ if eq \$l "zh" \}\}([\s\S]*?)\{\{ else if eq \$l "en" \}\}([\s\S]*?)\{\{ else \}\}([\s\S]*?)\{\{ end \}\}/g, (_, zh, en, ko) => locale === "zh" ? zh : locale === "en" ? en : ko);
  return s.replace(/\{\{ \$l \}\}/g, locale);
}
let bad = 0;
for (const [file, pairs] of Object.entries(FILES)) {
  const path = new URL(`./${file}`, import.meta.url);
  const original = readFileSync(path, "utf8");
  if (original.startsWith("{{ $l :=")) { console.log("skip (already built)", file); continue; }
  let s = original;
  for (const [ko, en, zh] of [...pairs, ...COMMON]) {
    if (!s.includes(ko)) { if (!COMMON.some((c) => c[0] === ko)) { console.log("  ✗ MISSING in", file, ":", ko.slice(0, 40)); bad++; } continue; }
    s = s.split(ko).join(c(ko, en, zh));
  }
  s = s.replace(CONTACT_TAIL, (_, a) => `${a}${c(" 로 문의해주세요.", ".", "。")}`);
  s = s.replace('<html lang="ko">', '<html lang="{{ $l }}">');
  s = DECL + "\n" + s;
  // 자가 검증
  const ko = render(s, "ko"), en = render(s, "en"), zh = render(s, "zh");
  const koSame = ko.replace('<html lang="ko">', '<html lang="ko">').trim() === original.replace('<html lang="ko">', '<html lang="ko">').trim();
  const hangul = (t) => (t.replace(/<!--[\s\S]*?-->/g, "").match(/[가-힣]+/g) ?? []);
  const enKo = hangul(en), zhKo = hangul(zh);
  const ok = koSame && enKo.length === 0 && zhKo.length === 0 && en.includes("{{ .ConfirmationURL }}");
  console.log(ok ? "  ✓" : "  ✗", file, `ko동일=${koSame} en잔여한글=${enKo.length} zh잔여한글=${zhKo.length}`, enKo.slice(0, 3).join(","), zhKo.slice(0, 3).join(","));
  if (!ok) bad++;
  else writeFileSync(path, s);
}
process.exit(bad ? 1 : 0);
