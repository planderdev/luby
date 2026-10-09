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
 * 문구를 바꿀 때는 i18n-build.mjs 로 HTML 을 다시 만든 뒤 이 스크립트를 실행한다.
 * 제목은 subjects.json(ko/en/zh)을 고친다 — 본문과 같은 Go 템플릿으로 수신자 locale 에 따라 한 언어만 보낸다.
 * --dump-subjects <경로> 를 주면 실제로 보낼 제목 템플릿을 JSON 으로 써 둔다(Go 렌더 검증용).
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const REF = "ncyuljyeyuorgsfuzzmw";
const API = `https://api.supabase.com/v1/projects/${REF}/config/auth`;
const dir = path.dirname(fileURLToPath(import.meta.url));
const dryRun = process.argv.includes("--dry-run");

/** [Supabase 키, 본문 파일] */
const TEMPLATES = [
  ["confirmation", "01-confirm-signup.html"],
  ["magic_link", "02-magic-link.html"],
  ["recovery", "03-reset-password.html"],
  ["email_change", "04-change-email.html"],
  ["invite", "05-invite-user.html"],
];
const SUBJECTS = JSON.parse(fs.readFileSync(path.join(dir, "subjects.json"), "utf8"));

/**
 * 제목 한 줄 Go 템플릿. user_metadata 가 비었거나 locale 이 없어도 실행 오류가 나지 않도록 with 로 감싼다
 * (제목 실행 오류는 메일 발송 실패로 이어진다). en/zh 외 값은 ko.
 */
function subjectTemplate(key) {
  const s = SUBJECTS[key];
  if (!s?.ko || !s?.en || !s?.zh) throw new Error(`subjects.json: ${key} 의 ko/en/zh 가 필요합니다`);
  for (const v of [s.ko, s.en, s.zh]) if (/[{}\n]/.test(v)) throw new Error(`subjects.json: ${key} 에 중괄호·줄바꿈은 쓸 수 없습니다`);
  return `{{ $l := "ko" }}{{ with .Data }}{{ with .locale }}{{ $l = printf "%v" . }}{{ end }}{{ end }}{{ if eq $l "zh" }}${s.zh}{{ else if eq $l "en" }}${s.en}{{ else }}${s.ko}{{ end }}`;
}

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
for (const [key, file] of TEMPLATES) {
  const html = fs.readFileSync(path.join(dir, file), "utf8");
  if (!html.startsWith("{{ $l := \"ko\" }}{{ with .Data }}")) throw new Error(`${file}: 첫 줄 언어 선언이 없습니다 (i18n-build.mjs 로 다시 만드세요)`);
  if (!html.includes("{{ .ConfirmationURL }}")) throw new Error(`${file}: {{ .ConfirmationURL }} 가 없습니다`);
  body[`mailer_subjects_${key}`] = subjectTemplate(key);
  body[`mailer_templates_${key}_content`] = html;
  console.log(`  ${key.padEnd(13)} ${file} ${html.length} chars`);
}

const dumpAt = process.argv.indexOf("--dump-subjects");
if (dumpAt > 0) {
  const out = Object.fromEntries(TEMPLATES.map(([k]) => [k, body[`mailer_subjects_${k}`]]));
  fs.writeFileSync(process.argv[dumpAt + 1], JSON.stringify(out, null, 1));
  console.log(`subjects → ${process.argv[dumpAt + 1]}`);
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
