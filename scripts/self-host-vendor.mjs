#!/usr/bin/env node
/**
 * 랜딩(luby-re 시안) 산출물의 jsDelivr 의존을 사이트 직접 호스팅(/vendor/…)으로 바꾼다 — 2026-10-12.
 *
 * 왜: 중국 본토에서는 cdn.jsdelivr.net 이 막히거나 매우 느리다. 랜딩은 GSAP → ScrollTrigger → Lenis → Lucide → 시안 번들
 * 순서로 스크립트를 이어 붙이는데, 앞의 하나가 오지 않으면 번들이 실행되지 않아 히어로 문구·섹션 제목이 숨은 채로 남았다
 * (scripts/.local/diag-cn-reveal.mjs 로 재현: 외부 응답 없음 → 제목 4개 계속 숨김).
 * 파일은 npm 레지스트리 원본(public/vendor/<pkg>@<ver>/, jsDelivr 와 해시 동일 확인)이고 SUIT 글꼴만 시안이 쓰던 파일 그대로다.
 *
 * 사용:
 *   node scripts/self-host-vendor.mjs          # 생성 파일(조각·lre.css·lre-chrome.css)에 적용
 *   import { selfHostVendor, applyToGenerated } — luby-re-sync.mjs 가 마지막에 호출
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RULES = [
  [/https:\/\/cdn\.jsdelivr\.net\/npm\/gsap@3\.15\.0\/dist\//g, "/vendor/gsap@3.15.0/"],
  [/https:\/\/cdn\.jsdelivr\.net\/npm\/lenis@1\.3\.26\/dist\//g, "/vendor/lenis@1.3.26/"],
  [/https:\/\/cdn\.jsdelivr\.net\/npm\/lucide@1\.38\.0\/dist\/umd\//g, "/vendor/lucide@1.38.0/"],
  [/https:\/\/cdn\.jsdelivr\.net\/npm\/remixicon@4\.9\.0\/fonts\//g, "/vendor/remixicon@4.9.0/"],
  [/https:\/\/cdn\.jsdelivr\.net\/gh\/sunn-us\/SUIT\/fonts\/variable\/woff2\//g, "/vendor/suit/"],
  // 더 이상 쓰지 않는 사전 연결(JSON 문자열 안의 \" 형태와 일반 HTML 형태 모두)
  [/<link rel=\\"preconnect\\" href=\\"https:\/\/cdn\.jsdelivr\.net\\">\\n/g, ""],
  [/<link rel="preconnect" href="https:\/\/cdn\.jsdelivr\.net">\n?/g, ""],
];

export function selfHostVendor(text) {
  let s = text;
  for (const [re, to] of RULES) s = s.replace(re, to);
  return s;
}

/** 자동 생성 파일 목록 — 랜딩 조각(.ts)·페이지별 lre.css·landing-re.css·lre-chrome.css */
export function generatedFiles(root) {
  const out = [];
  const frag = join(root, "components/landing-re");
  for (const f of readdirSync(frag)) if (f.endsWith("-fragment.ts")) out.push(join(frag, f));
  for (const f of ["app/landing-re.css", "app/lre-chrome.css"]) if (existsSync(join(root, f))) out.push(join(root, f));
  for (const d of readdirSync(join(root, "app"), { withFileTypes: true })) {
    if (d.isDirectory() && existsSync(join(root, "app", d.name, "lre.css"))) out.push(join(root, "app", d.name, "lre.css"));
  }
  return out;
}

export function applyToGenerated(root) {
  const changed = [];
  for (const f of generatedFiles(root)) {
    const before = readFileSync(f, "utf8");
    const after = selfHostVendor(before);
    if (after !== before) { writeFileSync(f, after); changed.push(f.slice(root.length + 1)); }
  }
  return changed;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const changed = applyToGenerated(root);
  console.log(`self-host-vendor: ${changed.length} files`);
  for (const f of changed) console.log("  ", f);
  const left = generatedFiles(root).filter((f) => readFileSync(f, "utf8").includes("cdn.jsdelivr.net"));
  if (left.length) { console.error("jsDelivr 참조가 남은 파일:", left.map((f) => f.slice(root.length + 1))); process.exit(1); }
}
