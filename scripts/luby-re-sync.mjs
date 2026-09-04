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
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
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
    // 시안 JS 가 real body 에 토글하는 상태 클래스(is-menu-open 등)는 body 셀렉터를 유지해야 동작한다
    .replace(/\bbody\b(?!\.is-)/g, ".lre-root")
    .replace(/\bhtml\b(?![.\w-])/g, ".lre-root")
    // body 였을 땐 뷰포트 특례로 sticky 가 살지만 일반 div(.lre-root)의 overflow-x: hidden 은
    // 하위 position: sticky 를 전부 죽인다 — clip 은 스크롤 컨테이너를 만들지 않아 sticky 가 보존된다
    .replace(/(\.lre-root\s*\{[^}]*?)overflow-x: hidden/g, "$1overflow-x: clip")
    // 언어 드롭다운 항목이 button → a 로 바뀌었으므로 셀렉터를 확장한다 (:hover 등 접미사 보존,
    // 링크의 활성 표시는 aria-checked 대신 aria-current)
    .replace(/\.language-dropdown__panel button([^,{]*)/g, (m, suf) => {
      const aSuf = suf.replace(/\[aria-(?:checked|pressed)="true"\]/g, '[aria-current="true"]');
      return `.language-dropdown__panel button${suf}, .language-dropdown__panel a${aSuf}`;
    })
    .replace(/url\((['"]?)\.\.\/svg\//g, "url($1/lre/svg/")
    .replace(/url\((['"]?)\.\.\/image\//g, `url($1${VIDEO_BASE}/image/`)
    .replace(/url\((['"]?)\.\.\/video\//g, `url($1${VIDEO_BASE}/`);

// 언어 전환은 클라이언트 텍스트 스왑 대신 실제 라우트 링크로 — 각 로케일이 서버 렌더 페이지다
const LANG_ROUTES = { ko: "/", en: "/en", zh: "/zh" };

const rewriteBody = (body) => {
  for (const [from, to] of LINKS) {
    body = body.replace(new RegExp(`href="(\\.\\./|\\./)?${from}"`, "g"), `href="${to}"`);
  }
  body = body.replace(
    /<button type="button" role="menuitemradio" data-lang-toggle="(ko|en|zh)"[^>]*>([\s\S]*?)<\/button>/g,
    (_, code, inner) => `<a role="menuitemradio" data-lang-link="${code}" href="${LANG_ROUTES[code]}">${inner}</a>`
  );
  return body
    .replace(/(src|href)="(\.\.\/|\.\/)?assets\/svg\//g, '$1="/lre/svg/')
    .replace(/(src|href)="(\.\.\/|\.\/)?assets\/image\//g, `$1="${VIDEO_BASE}/image/`)
    .replace(/(src|href)="(\.\.\/|\.\/)?assets\/video\//g, `$1="${VIDEO_BASE}/`);
};

/** 페이지의 로케일 링크에 활성 표시를 단다 (CSS 는 a[aria-current] 를 강조하도록 패치됨) */
const markLang = (html, code) =>
  html
    .replace(/(<a role="menuitemradio" data-lang-link="[a-z]+") aria-current="true"/g, "$1")
    .replace(`data-lang-link="${code}"`, `data-lang-link="${code}" aria-current="true"`);

// 홈은 기존 기획 섹션(React)을 CTA(contact-choice) 직전에 끼워 넣는다 — 조각을 둘로 나눠 내보낸다.
// innerHTML 파서가 열린 태그를 자동으로 닫아버리므로, 양쪽 모두 완결된 .lre-root 래퍼로 감싼다
// (형제 .lre-root 두 개가 되지만 스코프 CSS·토큰은 동일하게 적용된다).
const SPLIT_MARK = '<section class="contact-choice';
const splitExports = (fragment) => {
  const i = fragment.indexOf(SPLIT_MARK);
  const wrapper = fragment.match(/<div class="lre-root[^"]*">/)?.[0];
  if (i === -1 || !wrapper) return "";
  return (
    `export const fragmentTop = ${JSON.stringify(fragment.slice(0, i) + "</div>")};\n` +
    `export const fragmentBottom = ${JSON.stringify(wrapper + fragment.slice(i))};\n`
  );
};

const referenced = new Set();
let homeParts = null;
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

  body = rewriteBody(body);

  const fragment = markLang(headLinks.join("\n") + `\n<div class="lre-root ${bodyClass}">` + body + "</div>", "ko");
  if (p.name === "home") homeParts = { headLinks: headLinks.join("\n"), fragment };
  writeFileSync(
    join(ROOT, `components/landing-re/${p.name}-fragment.ts`),
    "// 자동 생성 — scripts/luby-re-sync.mjs 가 luby-re 시안에서 만들었다. 직접 수정 금지.\n" +
      `export const fragment = ${JSON.stringify(fragment)};\n` +
      splitExports(fragment) +
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

// ── 인증(로그인·가입·재설정) 스킨 산출물 — 폼 로직은 React 가 갖고, 시안에선 크롬(헤더·푸터)과 CSS 만 가져온다
{
  const html = execFileSync("npx", ["-y", "@php-wasm/cli", "login.php"], { cwd: SRC, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  let body = html
    .replace(/[\s\S]*<body[^>]*>/, "")
    .replace(/<\/body>[\s\S]*/, "")
    .replace(/<script[\s\S]*?<\/script>/g, "");
  body = rewriteBody(body);
  const pre = markLang(body.replace(/<main[\s\S]*/, ""), "ko");
  const post = body.replace(/[\s\S]*<\/main>/, "");
  writeFileSync(
    join(ROOT, "components/landing-re/auth-chrome.ts"),
    "// 자동 생성 — scripts/luby-re-sync.mjs 가 luby-re 시안에서 만들었다. 직접 수정 금지.\n" +
      `export const authPre = ${JSON.stringify(pre)};\n` +
      `export const authPost = ${JSON.stringify(post)};\n`
  );
  const authCss = scopeCss(sharedCss + "\n\n/* ═══ signup.css ═══ */\n" + readFileSync(join(SRC, "assets/css/signup.css"), "utf8"));
  writeFileSync(join(ROOT, "app/lre-auth.css"), "/* 자동 생성 — scripts/luby-re-sync.mjs. 직접 수정 금지. */\n" + authCss);
  writeFileSync(
    join(ROOT, "public/lre/shared.js"),
    `/* 자동 생성 — scripts/luby-re-sync.mjs */\nif (!window.__lre_shared) { window.__lre_shared = true;\n${sharedJs}\n}\n`
  );
  for (const m of (pre + post + authCss).matchAll(/\/lre\/svg\/([A-Za-z0-9_.-]+)/g)) referenced.add(`svg/${m[1]}`);
  for (const m of (pre + post + authCss).matchAll(new RegExp(`${VIDEO_BASE}/image/([A-Za-z0-9_.-]+)`, "g"))) {
    referenced.add(`image/${m[1]}`);
  }
  console.log("auth → 크롬", pre.length + post.length, "B");
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

// ── en/zh 홈 베이크 — 시안의 i18n 엔진(data.js+i18n.js)을 헤드리스 Chrome 에서 그대로 실행해
// 번역이 서버 렌더로 나가게 정적 조각을 만든다 (클라이언트 스왑 없음 → SEO·FOUC 문제 없음)
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
if (!existsSync(CHROME)) {
  console.warn("Chrome 미설치 — en/zh 베이크 생략 (기존 조각 유지)");
} else {
  const { default: puppeteer } = await import("puppeteer-core");
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
  const page = await browser.newPage();
  for (const locale of ["en", "zh"]) {
    await page.setContent(
      `<!doctype html><html><head><meta charset="utf-8"><title>x</title></head><body>${homeParts.fragment}</body></html>`
    );
    await page.addScriptTag({ path: join(SRC, "assets/js/data.js") });
    await page.addScriptTag({ path: join(SRC, "assets/js/i18n.js") });
    await page.evaluate((loc) => window.LUBY_I18N.setLocale(loc), locale);
    let html = await page.evaluate(() => document.querySelector(".lre-root").outerHTML);
    // 베이크 흔적 제거 — 남겨두면 클라이언트 i18n 이 키를 근거로 한국어로 되돌린다
    html = html.replace(/ data-i18n-key="[^"]*"/g, "").replace(/ data-i18n-attr-[a-z-]+="[^"]*"/g, "");
    html = markLang(homeParts.headLinks + "\n" + html, locale);
    writeFileSync(
      join(ROOT, `components/landing-re/home-${locale}-fragment.ts`),
      "// 자동 생성 — scripts/luby-re-sync.mjs (시안 i18n 엔진으로 베이크). 직접 수정 금지.\n" +
        `export const fragment = ${JSON.stringify(html)};\n` +
        splitExports(html)
    );
    console.log(`home-${locale} → 베이크`, html.length, "B");
  }
  await browser.close();
}
