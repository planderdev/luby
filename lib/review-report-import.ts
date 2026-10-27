import * as XLSX from "xlsx";
import { detectChannel, isProfileUrl, normalizeChannelText, type ReviewChannel } from "./review-channels";

/**
 * 결과 보고서용 엑셀 파서 — 리뷰(게시물) 링크가 든 시트를 읽어 보고서 행으로 만든다.
 *
 * 두 가지 모드:
 *  - header: 첫 20행 안에서 '리뷰 링크·계정·이름·팔로워·좋아요…' 같은 열 이름(한/중/영)을 찾아 열을 매핑
 *  - links : 열 이름이 없거나 못 알아들으면 '강제' 모드 — 행 안의 URL 을 찾아 게시물/계정 링크로 삼고,
 *            짧은 글자 칸을 이름으로 쓴다. 링크만 있으면 무조건 보고서를 만든다는 원칙.
 * 숫자는 1,234 · 1.2만 · 3.5K · 1M · 2万 표기를 모두 정수로 바꾼다.
 */
export type ReviewImportRow = {
  seq: number;
  channel: ReviewChannel | string;
  creator_name: string | null;
  creator_url: string | null;
  post_url: string | null;
  posted_at: string | null; // YYYY-MM-DD
  followers: number | null;
  likes: number | null;
  comments: number | null;
  views: number | null;
  note: string | null;
  errors: string[];
};

type Key = "seq" | "posted_at" | "channel" | "followers" | "likes" | "comments" | "views" | "creator_url" | "creator_name" | "post_url" | "note";

/** 우선순위 순서 — 한 칸은 처음 맞는 키 하나에만 배정된다 ('계정 링크' 는 creator_url, '리뷰 링크' 는 post_url) */
const COLUMN_KEYS: [Key, RegExp][] = [
  ["seq", /^\s*(#|no\.?|순번|번호|序号|顺号|順番|idx)\s*$/i],
  ["posted_at", /일자|날짜|date|日期|방문일|방문|访问|게시일|발행일|업로드일|작성일/i],
  ["channel", /^\s*(채널|플랫폼|매체|platform|channel|渠道|平台|sns)\s*$/i],
  ["followers", /팔로워|팔로우|구독자|粉丝|follower|subscriber/i],
  ["likes", /좋아요|하트|공감|点赞|like/i],
  ["comments", /댓글|评论|comment/i],
  ["views", /조회|재생|播放|浏览|view/i],
  ["creator_url", /계정|프로필|账号|账户|profile|account|主页|(채널|크리에이터|인플루언서|creator|influencer|리뷰어|blogger|블로거)\s*(링크|url|주소|link)/i],
  ["creator_name", /이름|닉네임|성명|크리에이터|인플루언서|리뷰어|블로거|name|nick|creator|influencer|reviewer|blogger|名称|昵称|达人|博主/i],
  ["post_url", /리뷰|review|업로드|게시|콘텐츠|포스팅|포스트|post|url|링크|link|发布|笔记|链接|주소|영상|video|노트/i],
  ["note", /내용|비고|메모|note|memo|remark|内容|备注|summary|특이|코멘트/i],
];

const URL_RE = /https?:\/\/[^\s"'<>）)\]]+/gi;

function toDate(v: unknown): string | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") {
    const d = XLSX.SSF.parse_date_code(v);
    if (!d || d.y < 2000 || d.y > 2100) return null;
    return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v.toISOString().slice(0, 10);
  const s = String(v).trim();
  const m = s.match(/(20\d{2})[.\-/년\s]+(\d{1,2})[.\-/월\s]+(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  const m2 = s.match(/^(\d{1,2})[.\-/월\s]+(\d{1,2})일?$/); // '10.21' 처럼 연도 없는 표기 → 올해
  if (m2) return `${new Date().getFullYear()}-${m2[1].padStart(2, "0")}-${m2[2].padStart(2, "0")}`;
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : new Date(t).toISOString().slice(0, 10);
}

export function toCount(v: unknown): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? Math.round(v) : null;
  const s = String(v).replace(/[,\s]/g, "").toLowerCase();
  const m = s.match(/^([\d.]+)\s*(만|万|w|천|k|m|억)?(명|개|회|건|팔로워)?$/);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n)) return null;
  const mul: Record<string, number> = { 만: 1e4, 万: 1e4, w: 1e4, 천: 1e3, k: 1e3, m: 1e6, 억: 1e8 };
  return Math.round(n * (m[2] ? mul[m[2]] : 1));
}

function cellText(v: unknown): string {
  if (v == null) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).trim();
}
function firstUrl(v: unknown): string | null {
  const s = cellText(v);
  const m = s.match(URL_RE);
  return m ? m[0] : null;
}
function isUrl(s: string) {
  return /^https?:\/\//i.test(s);
}

export function listSheets(buf: ArrayBuffer): string[] {
  return XLSX.read(buf, { type: "array", bookSheets: true }).SheetNames;
}

export type ParsedReviewFile = {
  sheets: string[];
  sheet: string;
  mode: "header" | "links";
  rows: ReviewImportRow[];
  /** 링크를 하나도 찾지 못했을 때만 */
  error?: string;
};

export function parseReviewReportFile(buf: ArrayBuffer, sheetName?: string): ParsedReviewFile {
  const wb = XLSX.read(buf, { type: "array", codepage: 65001, cellDates: false });
  const sheets = wb.SheetNames;
  const sheet = sheetName && sheets.includes(sheetName) ? sheetName : sheets[0];
  const ws = wb.Sheets[sheet];
  const aoa: unknown[][] = ws ? XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, blankrows: false, raw: true }) : [];

  // 1) 헤더 행 찾기 — 링크 계열 열(post_url 또는 creator_url)이 있고 키가 2개 이상 잡히는 첫 행
  let headerIdx = -1;
  let map: Partial<Record<Key, number>> = {};
  for (let i = 0; i < Math.min(aoa.length, 20); i++) {
    const cells = (aoa[i] ?? []).map(cellText);
    if (cells.some((c) => isUrl(c))) continue; // 데이터 행은 헤더가 아니다
    const found: Partial<Record<Key, number>> = {};
    cells.forEach((cell, col) => {
      if (!cell) return;
      for (const [key, re] of COLUMN_KEYS) {
        if (found[key] === undefined && re.test(cell)) {
          found[key] = col;
          break;
        }
      }
    });
    const keys = Object.keys(found).length;
    if ((found.post_url !== undefined || found.creator_url !== undefined) && keys >= 2) {
      headerIdx = i;
      map = found;
      break;
    }
  }

  const rows: ReviewImportRow[] = [];
  let autoSeq = 0;

  if (headerIdx >= 0) {
    for (let i = headerIdx + 1; i < aoa.length; i++) {
      const r = aoa[i] ?? [];
      const get = (k: Key) => (map[k] === undefined ? undefined : r[map[k]!]);
      const text = (k: Key) => cellText(get(k));
      let postUrl = firstUrl(get("post_url"));
      let creatorUrl = firstUrl(get("creator_url"));
      let creatorName = text("creator_name") || null;
      // 계정 칸에 @아이디만 적혀 있으면 이름으로
      if (!creatorUrl && text("creator_url") && !creatorName) creatorName = text("creator_url");
      // 리뷰 링크 칸이 비었으면: 계정 칸의 링크가 게시물처럼 보이면 그걸, 아니면 행의 다른 칸에서 URL 을 찾는다
      if (!postUrl) {
        if (creatorUrl && !isProfileUrl(creatorUrl)) { postUrl = creatorUrl; creatorUrl = null; }
        else {
          const mapped = new Set(Object.values(map));
          for (let c = 0; c < r.length; c++) {
            if (mapped.has(c)) continue;
            const u = firstUrl(r[c]);
            if (u && u !== creatorUrl) { postUrl = u; break; }
          }
        }
      }
      const anyContent = postUrl || creatorUrl || creatorName || text("note");
      if (!anyContent) continue; // 빈 줄·합계 줄
      autoSeq += 1;
      const channelText = text("channel");
      const channel = normalizeChannelText(channelText) ?? detectChannel(postUrl ?? creatorUrl) ?? "other";
      const row: ReviewImportRow = {
        seq: toCount(get("seq")) ?? autoSeq,
        channel: channel === "other" && channelText ? channelText : channel,
        creator_name: creatorName,
        creator_url: creatorUrl,
        post_url: postUrl,
        posted_at: toDate(get("posted_at")),
        followers: toCount(get("followers")),
        likes: toCount(get("likes")),
        comments: toCount(get("comments")),
        views: toCount(get("views")),
        note: text("note") || null,
        errors: [],
      };
      if (!row.post_url) row.errors.push("리뷰 링크가 없습니다");
      rows.push(row);
    }
    return { sheets, sheet, mode: "header", rows, error: rows.length === 0 ? "표 아래에 데이터 행이 없습니다." : undefined };
  }

  // 2) 강제 모드 — 열 이름 없이 URL 만 보고 행을 만든다
  for (let i = 0; i < aoa.length; i++) {
    const r = aoa[i] ?? [];
    const cells = r.map(cellText);
    const urls = cells.flatMap((c) => c.match(URL_RE) ?? []);
    if (urls.length === 0) continue;
    const post = urls.find((u) => !isProfileUrl(u)) ?? urls[0];
    const creator = urls.find((u) => u !== post && isProfileUrl(u)) ?? null;
    const name = cells.find((c) => c && !isUrl(c) && !/^[\d.,\s%만천kK]+$/.test(c) && toDate(c) === null && c.length <= 40 && !normalizeChannelText(c)) ?? null;
    const channelCell = cells.find((c) => c && !isUrl(c) && normalizeChannelText(c));
    const date = cells.map((c) => (isUrl(c) ? null : c.match(/20\d{2}[.\-/년]/) ? toDate(c) : null)).find(Boolean) ?? null;
    const numbers = r.filter((v) => typeof v === "number" && Number.isFinite(v) && !(v > 40000 && v < 60000 && Number.isInteger(v))) as number[]; // 엑셀 날짜 일련번호 대역 제외
    autoSeq += 1;
    rows.push({
      seq: autoSeq,
      channel: (channelCell && normalizeChannelText(channelCell)) || detectChannel(post),
      creator_name: name,
      creator_url: creator,
      post_url: post,
      posted_at: date,
      followers: numbers.length >= 1 ? Math.round(numbers[0]) : null,
      likes: numbers.length >= 2 ? Math.round(numbers[1]) : null,
      comments: null,
      views: null,
      note: null,
      errors: [],
    });
  }
  return {
    sheets,
    sheet,
    mode: "links",
    rows,
    error: rows.length === 0 ? "시트에서 리뷰 링크(https://…)를 찾지 못했습니다. 링크가 든 시트인지 확인해주세요." : undefined,
  };
}
