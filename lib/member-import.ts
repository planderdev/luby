import "server-only";
import * as XLSX from "xlsx";

/**
 * 회원 대량 등록 — CSV/XLSX 파싱·검증. 헤더는 한글/영문 모두 허용.
 * 템플릿 열: 역할, 이메일, 이름, 연락처, 회사명, 사업자등록번호, 활동지역, 대표채널, 채널URL, 전문분야, 비밀번호
 */
export type ImportRow = {
  line: number;
  role: "advertiser" | "influencer" | null;
  advertiserKind: "brand" | "agency";
  email: string;
  name: string;
  phone: string;
  companyName: string;
  businessNumber: string;
  regionName: string;
  regionId: string | null;
  channelName: string;
  channelTypeId: string | null;
  channelUrl: string;
  categoryNames: string[];
  categoryIds: string[];
  password: string;
  errors: string[];
};

export type Catalog = {
  regions: { id: string; name: string }[];
  channelTypes: { id: string; name: string; slug: string }[];
  categories: { id: string; name: string }[];
};

const HEADER_ALIASES: Record<string, string> = {
  "역할": "role", role: "role", "유형": "role",
  "이메일": "email", email: "email",
  "이름": "name", name: "name", "담당자": "name", "닉네임": "name",
  "연락처": "phone", phone: "phone", "전화": "phone",
  "회사명": "company", company: "company", company_name: "company", "상호": "company", "대행사명": "company",
  "사업자등록번호": "bizno", "사업자번호": "bizno", business_number: "bizno", bizno: "bizno",
  "활동지역": "region", "지역": "region", region: "region",
  "대표채널": "channel", "채널": "channel", channel: "channel", channel_type: "channel",
  "채널url": "channel_url", channel_url: "channel_url", url: "channel_url",
  "전문분야": "categories", "분야": "categories", categories: "categories", category: "categories",
  "비밀번호": "password", password: "password",
};

function normHeader(h: unknown): string {
  const k = String(h ?? "").trim().toLowerCase().replace(/\s+/g, "").replace(/[()（）]/g, "");
  return HEADER_ALIASES[k] ?? k;
}
function roleOf(v: string): { role: ImportRow["role"]; kind: "brand" | "agency" } {
  const s = v.trim().toLowerCase();
  if (["크리에이터", "인플루언서", "influencer", "creator"].includes(s)) return { role: "influencer", kind: "brand" };
  if (["대행사", "실행사", "agency", "마케팅대행사", "마케팅 대행사", "마케팅 대행사·실행사", "대행사·실행사"].includes(s)) return { role: "advertiser", kind: "agency" };
  if (["광고주", "브랜드", "brand", "advertiser", "자영업", "브랜드·자영업"].includes(s)) return { role: "advertiser", kind: "brand" };
  return { role: null, kind: "brand" };
}
const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, "");

export function parseMemberFile(buf: ArrayBuffer, catalog: Catalog): { rows: ImportRow[]; headerError?: string } {
  const wb = XLSX.read(buf, { type: "array", codepage: 65001 });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) return { rows: [], headerError: "시트를 찾을 수 없습니다." };
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, blankrows: false, raw: false });
  if (aoa.length < 2) return { rows: [], headerError: "데이터 행이 없습니다 (1행 헤더 + 2행부터 데이터)." };
  const headers = (aoa[0] as unknown[]).map(normHeader);
  const idx = (k: string) => headers.indexOf(k);
  if (idx("email") < 0 || idx("role") < 0 || idx("name") < 0) {
    return { rows: [], headerError: `필수 헤더(역할, 이메일, 이름)가 없습니다. 현재 헤더: ${(aoa[0] as unknown[]).join(", ")}` };
  }
  const cell = (r: unknown[], k: string) => { const i = idx(k); return i >= 0 ? String(r[i] ?? "").trim() : ""; };
  const regionByName = new Map(catalog.regions.map((r) => [norm(r.name), r.id]));
  const KO_REGION: Record<string, string> = { "한국": "korea", "대한민국": "korea", "일본": "japan", "미국": "usa", "대만": "taiwan", "태국": "thailand", "베트남": "vietnam", "인도네시아": "indonesia", "필리핀": "philippines", "싱가포르": "singapore", "말레이시아": "malaysia", "홍콩": "hongkong", "중국": "china" };
  const channelByName = new Map<string, string>();
  for (const c of catalog.channelTypes) { channelByName.set(norm(c.name), c.id); channelByName.set(norm(c.slug), c.id); channelByName.set(norm(c.name.replace(/\s*\(.*\)$/, "")), c.id); }
  const KO_CHANNEL: Record<string, string> = { "인스타그램": "instagram", "인스타": "instagram", "유튜브": "youtube", "틱톡": "tiktok", "블로그": "blog", "네이버블로그": "blog", "스레드": "threads", "샤오홍슈": "xiaohongshu", "小红书": "xiaohongshu", "더우인": "douyin", "抖音": "douyin", "레몬8": "lemon8" };
  const categoryByName = new Map(catalog.categories.map((c) => [norm(c.name), c.id]));
  const seen = new Set<string>();
  const rows: ImportRow[] = [];
  for (let i = 1; i < aoa.length; i++) {
    const r = aoa[i] as unknown[];
    if (!r || r.every((v) => String(v ?? "").trim() === "")) continue;
    if (String(r[0] ?? "").trim().startsWith("#")) continue; // 템플릿 안내 행
    const { role, kind } = roleOf(cell(r, "role"));
    const email = cell(r, "email").toLowerCase();
    const row: ImportRow = {
      line: i + 1, role, advertiserKind: kind, email, name: cell(r, "name"), phone: cell(r, "phone"),
      companyName: cell(r, "company"), businessNumber: cell(r, "bizno"), regionName: cell(r, "region"), regionId: null,
      channelName: cell(r, "channel"), channelTypeId: null, channelUrl: cell(r, "channel_url"),
      categoryNames: cell(r, "categories").split(/[;,/|]/).map((s) => s.trim()).filter(Boolean), categoryIds: [],
      password: cell(r, "password"), errors: [],
    };
    if (!role) row.errors.push("역할은 광고주/대행사/크리에이터 중 하나");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) row.errors.push("이메일 형식");
    else if (seen.has(email)) row.errors.push("파일 내 이메일 중복");
    seen.add(email);
    if (!row.name) row.errors.push("이름 없음");
    if (role === "advertiser") {
      if (!row.companyName) row.errors.push("회사명 없음");
      const d = row.businessNumber.replace(/-/g, "");
      if (!/^\d{10}$/.test(d)) row.errors.push("사업자등록번호 10자리");
      else row.businessNumber = `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
    }
    if (role === "influencer") {
      if (row.regionName) {
        const key = KO_REGION[row.regionName.trim()] ?? norm(row.regionName);
        row.regionId = regionByName.get(key) ?? null;
        if (!row.regionId) row.errors.push(`지역 '${row.regionName}' 인식 불가`);
      }
      if (row.channelName) {
        const key = KO_CHANNEL[norm(row.channelName)] ?? norm(row.channelName);
        row.channelTypeId = channelByName.get(key) ?? null;
        if (!row.channelTypeId) row.errors.push(`채널 '${row.channelName}' 인식 불가`);
        if (row.channelTypeId && !row.channelUrl) row.errors.push("채널 URL 없음");
      }
      for (const cn of row.categoryNames) {
        const id = categoryByName.get(norm(cn));
        if (id) row.categoryIds.push(id); else row.errors.push(`분야 '${cn}' 인식 불가`);
      }
      if (row.categoryIds.length > 3) row.errors.push("전문 분야 최대 3개");
    }
    if (row.password && (row.password.length < 8 || !/[0-9]/.test(row.password) || !/[A-Za-z]/.test(row.password))) row.errors.push("비밀번호 8자+영문+숫자");
    rows.push(row);
  }
  return { rows };
}

export function memberTemplateCsv(catalog: Catalog): string {
  const header = ["역할", "이메일", "이름", "연락처", "회사명", "사업자등록번호", "활동지역", "대표채널", "채널URL", "전문분야", "비밀번호"];
  const ex1 = ["광고주", "brand@example.com", "김담당", "010-1234-5678", "루비카페", "123-45-67890", "", "", "", "", ""];
  const ex2 = ["대행사", "agency@example.com", "박대행", "010-2222-3333", "루비마케팅", "222-22-22222", "", "", "", "", ""];
  const ex3 = ["크리에이터", "creator@example.com", "이크리", "", "", "", "한국", "샤오홍슈", "https://www.xiaohongshu.com/user/profile/xxx", catalog.categories.slice(0, 2).map((c) => c.name).join(";"), ""];
  const note = ["# 역할: 광고주/대행사/크리에이터 · 사업자등록번호는 광고주·대행사 필수 · 지역/채널/분야는 한글 이름 · 전문분야는 ;로 구분(최대 3) · 비밀번호 열을 비우면 업로드 시 선택한 방식(초대 메일/임시 비밀번호) 적용"];
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const catsHint = ["# 사용 가능한 전문분야: " + catalog.categories.map((c) => c.name).join(", ")];
  const chHint = ["# 사용 가능한 채널: " + catalog.channelTypes.map((c) => c.name).join(", ") + " · 지역: " + catalog.regions.map((r) => r.name).join(", ")];
  return "﻿" + [header, ex1, ex2, ex3, note, catsHint, chHint].map((r) => r.map(esc).join(",")).join("\r\n");
}
