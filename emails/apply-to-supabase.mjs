#!/usr/bin/env node
/**
 * Supabase 관리 API 로 인증 메일 템플릿 5종(제목 + 본문 HTML)을 교체하고, 다시 읽어 파일과 글자 단위로 비교한다.
 *
 * 토큰: SUPABASE_ACCESS_TOKEN 환경 변수, 없으면 `npx supabase login` 이 macOS 키체인("Supabase CLI")에 저장한 값.
 * 토큰과 인증 설정의 다른 값(SMTP 비밀번호 등)은 출력하지 않는다.
 *
 * 사용:
 *   node emails/apply-to-supabase.mjs --dry-run   # 본문 검사만, API 호출 없음
 *   node emails/apply-to-supabase.mjs             # 교체 + 검증
 *
 * 문구를 바꿀 때는 i18n-build.mjs 로 HTML 을 다시 만든 뒤 이 스크립트를 실행한다. 제목은 아래 SUBJECTS 와 README 표를 함께 고친다.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const REF = "ncyuljyeyuorgsfuzzmw";
const API = `https://api.supabase.com/v1/projects/${REF}/config/auth`;
const dir = path.dirname(fileURLToPath(import.meta.url));
const dryRun = process.argv.includes("--dry-run");

/** [Supabase 키, 파일, 제목(분기 불가 — 세 언어 병기)] */
const TEMPLATES = [
  ["confirmation", "01-confirm-signup.html", "Luby AI 이메일 인증 · Verify your email · 邮箱验证"],
  ["magic_link", "02-magic-link.html", "Luby AI 로그인 링크 · Your login link · 登录链接"],
  ["recovery", "03-reset-password.html", "Luby AI 비밀번호 재설정 · Reset your password · 重置密码"],
  ["email_change", "04-change-email.html", "Luby AI 이메일 변경 확인 · Confirm email change · 确认更改邮箱"],
  ["invite", "05-invite-user.html", "Luby AI에 초대되었어요 · You're invited · 邀请函"],
];

function readToken() {
  if (process.env.SUPABASE_ACCESS_TOKEN) return process.env.SUPABASE_ACCESS_TOKEN.trim();
  try {
    let t = execFileSync("security", ["find-generic-password", "-s", "Supabase CLI", "-w"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (t.startsWith("go-keyring-base64:")) t = Buffer.from(t.slice("go-keyring-base64:".length), "base64").toString("utf8");
    return t;
  } catch {
    return "";
  }
}

const body = {};
for (const [key, file, subject] of TEMPLATES) {
  const html = fs.readFileSync(path.join(dir, file), "utf8");
  if (!html.startsWith("{{ $l := printf")) throw new Error(`${file}: 첫 줄 언어 선언이 없습니다 (i18n-build.mjs 로 다시 만드세요)`);
  if (!html.includes("{{ .ConfirmationURL }}")) throw new Error(`${file}: {{ .ConfirmationURL }} 가 없습니다`);
  body[`mailer_subjects_${key}`] = subject;
  body[`mailer_templates_${key}_content`] = html;
  console.log(`  ${key.padEnd(13)} ${file} ${html.length} chars`);
}

if (dryRun) {
  console.log("dry-run: API 호출 없음");
  process.exit(0);
}

const token = readToken();
if (!token) {
  console.error("토큰 없음: `npx supabase login` 을 실행하거나 SUPABASE_ACCESS_TOKEN 을 설정하세요.");
  process.exit(2);
}
const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

const res = await fetch(API, { method: "PATCH", headers, body: JSON.stringify(body) });
console.log(`PATCH ${res.status}`);
if (!res.ok) {
  console.error((await res.text()).slice(0, 400));
  process.exit(1);
}

const got = await (await fetch(API, { headers })).json();
let bad = 0;
for (const [k, v] of Object.entries(body)) {
  const ok = (got[k] ?? "") === v;
  if (!ok) bad++;
  console.log(`${ok ? "✓" : "✗"} ${k}`);
}
console.log(bad === 0 ? "ALL MATCH" : `MISMATCH ${bad}`);
process.exit(bad ? 1 : 0);
