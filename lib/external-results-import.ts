import * as XLSX from "xlsx";

/**
 * 외부 채널 체험단 결과 엑셀 파서 — 팀에서 샤오홍슈 방문 체험단을 오프라인으로 운영하며
 * 기록한 시트(순번·방문일자·계정링크·팔로워수·업로드 링크·좋아요·내용)를 읽는다.
 * 헤더는 한/중/영 표기가 섞여 있어 키워드로 열을 찾는다. 시트 하나가 캠페인 하나.
 */
export type ExternalResultRow = {
  seq: number;
  visited_at: string | null; // YYYY-MM-DD
  creator_url: string;
  followers: number | null;
  post_url: string | null;
  likes: number | null;
  note: string | null;
  errors: string[];
};

const COLUMN_KEYS: Record<keyof Omit<ExternalResultRow, "errors">, RegExp> = {
  seq: /순번|顺号|序号|seq|no\.?$/i,
  visited_at: /방문|访问|visit|date/i,
  creator_url: /계정|账户|账号|account|creator|프로필/i,
  followers: /팔로워|粉丝|follower/i,
  post_url: /업로드\s*링크|发布|post|게시|콘텐츠\s*링크|upload/i,
  likes: /좋아요|즐겨찾기|点赞|收藏|like/i,
  note: /내용|内容|content|summary|메모|비고|note/i,
};

function toDate(v: unknown): string | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") {
    const d = XLSX.SSF.parse_date_code(v);
    if (!d) return null;
    return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  const s = String(v).trim();
  const m = s.match(/(\d{4})[.\-/년\s]+(\d{1,2})[.\-/월\s]+(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : new Date(t).toISOString().slice(0, 10);
}
function toInt(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(String(v).replace(/[,\s]/g, "").replace(/만$/, "0000").replace(/천$/, "000"));
  return Number.isFinite(n) ? Math.round(n) : null;
}
function toUrl(v: unknown): string | null {
  const s = v == null ? "" : String(v).trim();
  return s ? s : null;
}

export function listSheets(buf: ArrayBuffer): string[] {
  return XLSX.read(buf, { type: "array", bookSheets: true }).SheetNames;
}

export function parseExternalResultsFile(
  buf: ArrayBuffer,
  sheetName?: string
): { sheets: string[]; sheet: string; rows: ExternalResultRow[]; headerError?: string } {
  const wb = XLSX.read(buf, { type: "array", codepage: 65001, cellDates: false });
  const sheets = wb.SheetNames;
  const sheet = sheetName && sheets.includes(sheetName) ? sheetName : sheets[0];
  const ws = wb.Sheets[sheet];
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, blankrows: false, raw: true });

  // 헤더 행: 계정/링크 계열 열이 있는 첫 행
  let headerIdx = -1;
  let map: Partial<Record<keyof typeof COLUMN_KEYS, number>> = {};
  for (let i = 0; i < Math.min(aoa.length, 15); i++) {
    const cells = (aoa[i] ?? []).map((c) => (c == null ? "" : String(c)));
    const found: typeof map = {};
    cells.forEach((cell, col) => {
      for (const key of Object.keys(COLUMN_KEYS) as (keyof typeof COLUMN_KEYS)[]) {
        if (found[key] === undefined && cell && COLUMN_KEYS[key].test(cell)) found[key] = col;
      }
    });
    if (found.creator_url !== undefined && (found.followers !== undefined || found.post_url !== undefined)) {
      headerIdx = i;
      map = found;
      break;
    }
  }
  if (headerIdx === -1) {
    return { sheets, sheet, rows: [], headerError: "헤더를 찾지 못했습니다. '계정링크'·'팔로워수'·'업로드 링크' 같은 열 이름이 있는 시트인지 확인해주세요." };
  }

  const rows: ExternalResultRow[] = [];
  let autoSeq = 0;
  for (let i = headerIdx + 1; i < aoa.length; i++) {
    const r = aoa[i] ?? [];
    const get = (k: keyof typeof COLUMN_KEYS) => (map[k] === undefined ? undefined : r[map[k]!]);
    const creator = toUrl(get("creator_url"));
    if (!creator) continue; // 빈 줄·합계 줄
    autoSeq += 1;
    const seq = toInt(get("seq")) ?? autoSeq;
    const row: ExternalResultRow = {
      seq,
      visited_at: toDate(get("visited_at")),
      creator_url: creator,
      followers: toInt(get("followers")),
      post_url: toUrl(get("post_url")),
      likes: toInt(get("likes")),
      note: (() => { const s = get("note"); return s == null || s === "" ? null : String(s).trim(); })(),
      errors: [],
    };
    if (!/^https?:\/\//i.test(row.creator_url)) row.errors.push("계정 링크가 URL 형식이 아닙니다");
    if (row.post_url && !/^https?:\/\//i.test(row.post_url)) row.errors.push("업로드 링크가 URL 형식이 아닙니다");
    rows.push(row);
  }
  return { sheets, sheet, rows };
}
