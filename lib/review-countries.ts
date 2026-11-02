/**
 * 결과 보고서 행의 국가 표기 — 엑셀의 '국가/나라/country/国家' 칸(한/중/일/영 표기, 깃발 이모지, 2자 코드)을
 * ISO 2자 코드(KR·JP·CN…)로 정규화해 저장하고, 화면에는 깃발 + 한글 이름으로 보여준다. 모르는 표기는 원문 그대로 둔다.
 */
const COUNTRIES: [code: string, label: string, aliases: RegExp][] = [
  ["KR", "한국", /^(한국|대한민국|남한|korea|korean|south ?korea|republic of korea|kr|kor|韩国|韓国|韓國|韩|韓|かんこく)$/],
  ["JP", "일본", /^(일본|japan|japanese|jp|jpn|日本|にほん|にっぽん)$/],
  ["CN", "중국", /^(중국|china|chinese|cn|chn|prc|中国|中國|大陆|大陸|内地|中国大陆|中国大陸|ちゅうごく)$/],
  ["TW", "대만", /^(대만|타이완|taiwan|taiwanese|tw|twn|台湾|台灣|臺灣)$/],
  ["HK", "홍콩", /^(홍콩|hong ?kong|hk|hkg|香港)$/],
  ["MO", "마카오", /^(마카오|macau|macao|mo|mac|澳门|澳門)$/],
  ["US", "미국", /^(미국|usa|united states|united states of america|america|american|us|美国|美國|アメリカ|米国)$/],
  ["TH", "태국", /^(태국|thailand|thai|th|tha|泰国|泰國|タイ)$/],
  ["VN", "베트남", /^(베트남|vietnam|viet ?nam|vietnamese|vn|vnm|越南|ベトナム)$/],
  ["ID", "인도네시아", /^(인도네시아|인니|indonesia|indonesian|id|idn|印尼|印度尼西亚|インドネシア)$/],
  ["PH", "필리핀", /^(필리핀|philippines|filipino|ph|phl|菲律宾|菲律賓|フィリピン)$/],
  ["SG", "싱가포르", /^(싱가포르|싱가폴|singapore|singaporean|sg|sgp|新加坡|シンガポール)$/],
  ["MY", "말레이시아", /^(말레이시아|malaysia|malaysian|my|mys|马来西亚|馬來西亞|マレーシア)$/],
  ["AU", "호주", /^(호주|오스트레일리아|australia|australian|au|aus|澳大利亚|澳洲|オーストラリア)$/],
  ["CA", "캐나다", /^(캐나다|canada|canadian|ca|can|加拿大|カナダ)$/],
  ["GB", "영국", /^(영국|uk|united kingdom|britain|british|england|gb|gbr|英国|英國|イギリス)$/],
  ["FR", "프랑스", /^(프랑스|france|french|fr|fra|法国|法國|フランス)$/],
  ["DE", "독일", /^(독일|germany|german|de|deu|德国|德國|ドイツ)$/],
  ["IN", "인도", /^(인도|india|indian|in|ind|印度|インド)$/],
  ["MN", "몽골", /^(몽골|mongolia|mongolian|mn|mng|蒙古|モンゴル)$/],
  ["RU", "러시아", /^(러시아|russia|russian|ru|rus|俄罗斯|俄羅斯|ロシア)$/],
  ["AE", "아랍에미리트", /^(아랍에미리트|uae|두바이|dubai|united arab emirates|ae|are|阿联酋|アラブ首長国連邦)$/],
  ["BR", "브라질", /^(브라질|brazil|brasil|brazilian|br|bra|巴西|ブラジル)$/],
  ["MX", "멕시코", /^(멕시코|mexico|mexican|mx|mex|墨西哥|メキシコ)$/],
  ["ES", "스페인", /^(스페인|spain|spanish|es|esp|西班牙|スペイン)$/],
  ["IT", "이탈리아", /^(이탈리아|italy|italian|it|ita|意大利|イタリア)$/],
];

const LABEL: Record<string, string> = Object.fromEntries(COUNTRIES.map(([c, l]) => [c, l]));
const FLAG_RE = /[\u{1F1E6}-\u{1F1FF}]/gu;

function flagToCode(text: string): string | null {
  const m = text.match(FLAG_RE);
  if (!m || m.length !== 2) return null;
  return m.map((ch) => String.fromCharCode(ch.codePointAt(0)! - 0x1f1e6 + 65)).join("");
}

/** 2자 코드 → 깃발 이모지 */
export function countryFlag(code: string): string {
  if (!/^[A-Z]{2}$/.test(code)) return "";
  return String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

export function isCountryCode(value: string | null | undefined): boolean {
  return !!value && !!LABEL[value];
}

/** 표기 → 알려진 코드. 모르면 null. ('한국인'·'韩国人' 같은 사람 표기, 깃발 이모지, 'KR' 도 인식) */
export function countryCode(text: string | null | undefined): string | null {
  if (!text) return null;
  const raw = String(text).trim();
  if (!raw) return null;
  const fromFlag = flagToCode(raw);
  if (fromFlag && LABEL[fromFlag]) return fromFlag;
  let s = raw.replace(FLAG_RE, "").toLowerCase().replace(/[.\-_()'"\[\]]/g, "").replace(/\s+/g, " ").trim();
  s = s.replace(/(인|사람|국적|출신|人|籍|人の)$/u, "").trim();
  if (!s) return null;
  for (const [code, , re] of COUNTRIES) if (re.test(s)) return code;
  return null;
}

/** 저장용 정규화 — 알려진 나라면 코드, 아니면 원문(40자). 빈 값은 null. */
export function normalizeCountry(text: string | null | undefined): string | null {
  if (!text) return null;
  const code = countryCode(text);
  if (code) return code;
  const raw = String(text).trim().slice(0, 40);
  return raw || null;
}

/** 표시용 — 코드면 '🇰🇷 한국', 아니면 원문 그대로 */
export function countryLabel(value: string | null | undefined, opts: { flag?: boolean } = {}): string {
  if (!value) return "";
  const label = LABEL[value];
  if (!label) return value;
  return opts.flag === false ? label : `${countryFlag(value)} ${label}`;
}
