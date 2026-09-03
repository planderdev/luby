/**
 * luby-re(팀장님 랜딩 리뉴얼 시안, PHP) → Next.js 산출물 동기화.
 *
 * 시안 마크업을 손대지 않고 그대로 가져오는 파이프라인이다. 팀장님이 luby-re 를
 * 갱신하면 이 스크립트만 다시 돌려 재반영한다. 수정은 기계적 치환(링크·에셋 경로·
 * 미포팅 페이지 숨김)만 한다.
 *
 * 사용: node scripts/luby-re-sync.mjs <luby-re 체크아웃 경로>
 *   1) php-wasm 으로 index.php 렌더 (npx @php-wasm/cli)
 *   2) body 조각 → components/landing-re/home-fragment.ts
 *   3) CSS 5종 스코프 치환(body→.lre-root) 연결 → app/landing-re.css
 *   4) JS 8종 연결 + 재실행 가드 → public/lre/home.js
 *   5) svg/image 복사 → public/lre/  (영상은 Supabase landing-assets 버킷, URL 참조)
 */
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SRC = process.argv[2];
if (!SRC) {
  console.error("사용법: node scripts/luby-re-sync.mjs <luby-re 경로>");
  process.exit(1);
}
const ROOT = new URL("..", import.meta.url).pathname;
const VIDEO_BASE = "https://ncyuljyeyuorgsfuzzmw.supabase.co/storage/v1/object/public/landing-assets";

// ── 1) 렌더
const html = execFileSync("npx", ["-y", "@php-wasm/cli", "index.php"], { cwd: SRC, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });

// ── 2) 조각 추출
const headLinks = [...html.matchAll(/<link[^>]+href="https:\/\/[^"]+"[^>]*>/g)].map((m) => m[0]);
let body = html.replace(/[\s\S]*<body[^>]*class="([^"]*)"[^>]*>/, "").replace(/<\/body>[\s\S]*/, "");
const bodyClass = html.match(/<body[^>]*class="([^"]*)"/)?.[1] ?? "";
body = body.replace(/<script[\s\S]*?<\/script>/g, "");

// 미포팅 페이지(브랜드·솔루션·크리에이터·FAQ)는 포팅될 때까지 내비·푸터에서 숨긴다
const UNPORTED = /(business\/business|creative\/creative|creator\/creator|faq\/faq)\.php/;
body = body.replace(/<li>(?:(?!<\/li>)[\s\S])*?\.php(?:(?!<\/li>)[\s\S])*?<\/li>/g, (li) => (UNPORTED.test(li) ? "" : li));
body = body.replace(/<a [^>]*href="\.\/(?:business\/business|creative\/creative|creator\/creator|faq\/faq)\.php"[\s\S]*?<\/a>/g, "");

// 실제 서비스 라우트로 연결 (시안엔 "./x.php" 와 "x.php" 두 표기가 섞여 있다)
body = body
  .replace(/href="(\.\/)?creator\/signup\.php"/g, 'href="/signup?role=influencer"')
  .replace(/href="(\.\/)?brand\/signup\.php"/g, 'href="/signup?role=advertiser"')
  .replace(/href="(\.\/)?login\.php"/g, 'href="/login"')
  .replace(/href="(\.\/)?forgot-password\.php"/g, 'href="/forgot-password"')
  .replace(/href="(\.\/)?index\.php#contact"/g, 'href="#contact"')
  .replace(/href="(\.\/)?index\.php"/g, 'href="/"')
  .replace(/(src|href)="(\.\/)?assets\/(svg|image)\//g, '$1="/lre/$3/')
  .replace(/(src|href)="(\.\/)?assets\/video\//g, `$1="${VIDEO_BASE}/`);

const fragment = headLinks.join("\n") + `\n<div class="lre-root ${bodyClass}">` + body + "</div>";
mkdirSync(join(ROOT, "components/landing-re"), { recursive: true });
writeFileSync(
  join(ROOT, "components/landing-re/home-fragment.ts"),
  "// 자동 생성 — scripts/luby-re-sync.mjs 가 luby-re 시안에서 만들었다. 직접 수정 금지.\n" +
    "export const homeFragment = " + JSON.stringify(fragment) + ";\n"
);

// ── 3) CSS: html/body 셀렉터를 래퍼로 스코프 (documentElement 클래스 셀렉터 html.x 는 유지)
const cssOrder = ["reset", "tokens", "common", "motion", "home"];
const css = cssOrder
  .map((n) => `/* ═══ ${n}.css ═══ */\n` + readFileSync(join(SRC, `assets/css/${n}.css`), "utf8"))
  .join("\n\n")
  .replace(/\bbody\b/g, ".lre-root")
  .replace(/\bhtml\b(?![.\w-])/g, ".lre-root")
  .replace(/url\((['"]?)\.\.\/(svg|image)\//g, "url($1/lre/$2/")
  .replace(/url\((['"]?)\.\.\/video\//g, `url($1${VIDEO_BASE}/`);
writeFileSync(join(ROOT, "app/landing-re.css"), "/* 자동 생성 — scripts/luby-re-sync.mjs. 직접 수정 금지. */\n" + css);

// ── 4) JS: footer.php 로드 순서 그대로 연결
const jsOrder = ["data", "i18n", "scroll", "common", "marquee", "counter", "motion", "pages/home"];
const js = jsOrder.map((n) => `/* ═══ ${n}.js ═══ */\n` + readFileSync(join(SRC, `assets/js/${n}.js`), "utf8")).join("\n\n");
mkdirSync(join(ROOT, "public/lre"), { recursive: true });
writeFileSync(
  join(ROOT, "public/lre/home.js"),
  "/* 자동 생성 — scripts/luby-re-sync.mjs (SPA 재진입 대비 1회 실행 가드) */\n" +
    "if (!window.__lreHome) { window.__lreHome = true;\n" + js + "\n}\n"
);

// ── 5) 정적 에셋 복사 — 조각·CSS 가 실제 참조하는 파일만 (svg/image, 영상은 Supabase 버킷)
const referenced = new Set(
  [...(fragment + css).matchAll(/\/lre\/(svg|image)\/([A-Za-z0-9_.-]+)/g)].map((m) => `${m[1]}/${m[2]}`)
);
for (const rel of referenced) {
  mkdirSync(join(ROOT, "public/lre", rel, ".."), { recursive: true });
  cpSync(join(SRC, "assets", rel), join(ROOT, "public/lre", rel));
}
console.log("에셋", referenced.size, "개 복사");
console.log("동기화 완료: fragment", fragment.length, "B / css", css.length, "B / js", js.length, "B");
