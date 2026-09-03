/**
 * luby-re(팀장님 랜딩 리뉴얼 시안, PHP) → Next.js 산출물 동기화.
 *
 * 시안 마크업을 손대지 않고 그대로 가져오는 파이프라인이다. 팀장님이 luby-re 를
 * 갱신하면 이 스크립트만 다시 돌려 재반영한다. 수정은 기계적 치환(링크·에셋 경로)만.
 *
 * 사용: node scripts/luby-re-sync.mjs <luby-re 체크아웃 경로>
 *   페이지별로: php-wasm 렌더 → 조각(components/landing-re/<이름>-fragment.ts, 제목·설명 포함)
 *   + CSS(공통 4종+페이지 css, body/html → .lre-root 스코프) + JS 번들(공통 7종+페이지 js)
 *   + svg/image 는 참조된 것만 public/lre/ 복사 (영상은 Supabase landing-assets 버킷 URL)
 */
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const SRC = process.argv[2];
if (!SRC) {
  console.error("사용법: node scripts/luby-re-sync.mjs <luby-re 경로>");
  process.exit(1);
}
const ROOT = new URL("..", import.meta.url).pathname;
const VIDEO_BASE = "https://ncyuljyeyuorgsfuzzmw.supabase.co/storage/v1/object/public/landing-assets";

// route: 서비스 경로 / cssOut: 라우트 옆에 생성되는 스타일 / pageCss·pageJs: 시안의 페이지 전용 파일
const PAGES = [
  { name: "home", php: "index.php", cssOut: "app/landing-re.css", pageCss: "home", pageJs: "home" },
  { name: "solutions", php: "creative/creative.php", cssOut: "app/solutions/lre.css", pageCss: "creative", pageJs: "creative" },
  { name: "brands", php: "business/business.php", cssOut: "app/brands/lre.css", pageCss: "business" },
  { name: "for-creators", php: "creator/creator.php", cssOut: "app/for-creators/lre.css", pageCss: "creator" },
  { name: "faq", php: "faq/faq.php", cssOut: "app/faq/lre.css", pageCss: "faq" },
];

// 시안 내부 링크 → 실제 서비스 라우트 ("./x", "../x", "x" 세 표기 모두)
const LINKS = [
  ["creator/signup\\.php", "/signup?role=influencer"],
  ["brand/signup\\.php", "/signup?role=advertiser"],
  ["login\\.php", "/login"],
  ["forgot-password\\.php", "/forgot-password"],
  ["business/business\\.php", "/brands"],
  ["creative/creative\\.php", "/solutions"],
  ["creator/creator\\.php", "/for-creators"],
  ["faq/faq\\.php", "/faq"],
  ["index\\.php#contact", "/#contact"],
  ["index\\.php", "/"],
];

const sharedCss = ["reset", "tokens", "common", "motion"]
  .map((n) => `/* ═══ ${n}.css ═══ */\n` + readFileSync(join(SRC, `assets/css/${n}.css`), "utf8"))
  .join("\n\n");
const sharedJs = ["data", "i18n", "scroll", "common", "marquee", "counter", "motion"]
  .map((n) => `/* ═══ ${n}.js ═══ */\n` + readFileSync(join(SRC, `assets/js/${n}.js`), "utf8"))
  .join("\n\n");

const scopeCss = (css) =>
  css
    .replace(/\bbody\b/g, ".lre-root")
    .replace(/\bhtml\b(?![.\w-])/g, ".lre-root")
    .replace(/url\((['"]?)\.\.\/svg\//g, "url($1/lre/svg/")
    .replace(/url\((['"]?)\.\.\/image\//g, `url($1${VIDEO_BASE}/image/`)
    .replace(/url\((['"]?)\.\.\/video\//g, `url($1${VIDEO_BASE}/`);

const referenced = new Set();
mkdirSync(join(ROOT, "components/landing-re"), { recursive: true });
mkdirSync(join(ROOT, "public/lre"), { recursive: true });

for (const p of PAGES) {
  const html = execFileSync("npx", ["-y", "@php-wasm/cli", p.php.split("/").pop()], {
    cwd: join(SRC, dirname(p.php)),
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });

  const title = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? "LUBY";
  const description = html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? "";
  const headLinks = [...html.matchAll(/<link[^>]+href="https:\/\/[^"]+"[^>]*>/g)].map((m) => m[0]);
  const bodyClass = html.match(/<body[^>]*class="([^"]*)"/)?.[1] ?? "";
  let body = html
    .replace(/[\s\S]*<body[^>]*>/, "")
    .replace(/<\/body>[\s\S]*/, "")
    .replace(/<script[\s\S]*?<\/script>/g, "");

  for (const [from, to] of LINKS) {
    body = body.replace(new RegExp(`href="(\\.\\./|\\./)?${from}"`, "g"), `href="${to}"`);
  }
  body = body
    .replace(/(src|href)="(\.\.\/|\.\/)?assets\/svg\//g, '$1="/lre/svg/')
    .replace(/(src|href)="(\.\.\/|\.\/)?assets\/image\//g, `$1="${VIDEO_BASE}/image/`)
    .replace(/(src|href)="(\.\.\/|\.\/)?assets\/video\//g, `$1="${VIDEO_BASE}/`);

  const fragment = headLinks.join("\n") + `\n<div class="lre-root ${bodyClass}">` + body + "</div>";
  writeFileSync(
    join(ROOT, `components/landing-re/${p.name}-fragment.ts`),
    "// 자동 생성 — scripts/luby-re-sync.mjs 가 luby-re 시안에서 만들었다. 직접 수정 금지.\n" +
      `export const fragment = ${JSON.stringify(fragment)};\n` +
      `export const pageTitle = ${JSON.stringify(title)};\n` +
      `export const pageDescription = ${JSON.stringify(description)};\n`
  );

  const css = scopeCss(
    sharedCss + `\n\n/* ═══ ${p.pageCss}.css ═══ */\n` + readFileSync(join(SRC, `assets/css/${p.pageCss}.css`), "utf8")
  );
  mkdirSync(join(ROOT, dirname(p.cssOut)), { recursive: true });
  writeFileSync(join(ROOT, p.cssOut), "/* 자동 생성 — scripts/luby-re-sync.mjs. 직접 수정 금지. */\n" + css);

  const js = p.pageJs
    ? sharedJs + `\n\n/* ═══ pages/${p.pageJs}.js ═══ */\n` + readFileSync(join(SRC, `assets/js/pages/${p.pageJs}.js`), "utf8")
    : sharedJs;
  writeFileSync(
    join(ROOT, `public/lre/${p.name}.js`),
    `/* 자동 생성 — scripts/luby-re-sync.mjs (SPA 재진입 대비 1회 실행 가드) */\nif (!window.__lre_${p.name.replace(/-/g, "_")}) { window.__lre_${p.name.replace(/-/g, "_")} = true;\n${js}\n}\n`
  );

  for (const m of (fragment + css).matchAll(/\/lre\/svg\/([A-Za-z0-9_.-]+)/g)) referenced.add(`svg/${m[1]}`);
  for (const m of (fragment + css).matchAll(new RegExp(`${VIDEO_BASE}/image/([A-Za-z0-9_.-]+)`, "g"))) {
    referenced.add(`image/${m[1]}`);
  }
  console.log(p.name, "→ 조각", fragment.length, "B");
}

// svg 는 리포(public/lre)에, 래스터 이미지는 영상과 같은 Supabase 버킷에 (git 비대 방지)
const uploads = [];
for (const rel of referenced) {
  if (rel.startsWith("svg/")) {
    mkdirSync(join(ROOT, "public/lre", dirname(rel)), { recursive: true });
    cpSync(join(SRC, "assets", rel), join(ROOT, "public/lre", rel));
  } else {
    uploads.push(rel);
  }
}
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (KEY) {
  const TYPES = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };
  for (const rel of uploads) {
    const data = readFileSync(join(SRC, "assets", rel));
    const r = await fetch(`https://ncyuljyeyuorgsfuzzmw.supabase.co/storage/v1/object/landing-assets/${rel}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${KEY}`, apikey: KEY, "x-upsert": "true",
        "Content-Type": TYPES[rel.split(".").pop()] ?? "application/octet-stream",
        "Cache-Control": "max-age=31536000",
      },
      body: data,
    });
    if (r.status !== 200) console.error("업로드 실패", rel, r.status);
  }
  console.log("이미지", uploads.length, "개 버킷 업로드 완료");
} else {
  console.warn("SUPABASE_SERVICE_ROLE_KEY 미설정 — 이미지", uploads.length, "개는 버킷에 있어야 한다:", uploads.join(", "));
}
console.log("svg", referenced.size - uploads.length, "개 복사 완료");
