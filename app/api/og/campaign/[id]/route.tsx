import { ImageResponse } from "next/og";
import { fetchPublicCampaign } from "@/components/PublicCampaignView";

/**
 * 캠페인 브랜드 OG 카드 (1200×630). 썸네일이 없어도 제목·브랜드·보상·채널이 보이는 공유 이미지.
 * - 공개 페이지 OG/트위터 메타, 디렉터리·공개 페이지 썸네일 폴백으로 사용
 * - 한글은 Google Fonts 텍스트 서브셋(TTF)으로 로드 (satori 는 woff2 미지원)
 */
export const revalidate = 3600;

const FALLBACK_HEADERS = { "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400" };

async function loadFont(text: string, weight: 400 | 700): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@${weight}&text=${encodeURIComponent(text)}`,
      { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 6.1; rv:10.0)" }, next: { revalidate: 86400 } }
    ).then((r) => r.text());
    const url = css.match(/src: url\((.+?)\) format\('truetype'\)/)?.[1];
    if (!url) return null;
    return await fetch(url, { next: { revalidate: 86400 } }).then((r) => r.arrayBuffer());
  } catch {
    return null;
  }
}

const fmtP = (n: number) => `${n.toLocaleString("ko-KR")}P`;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await fetchPublicCampaign(id);
  if (!c) return new Response("Not found", { status: 404 });

  const daysLeft = Math.ceil((new Date(c.recruit_end).getTime() - Date.now()) / 864e5);
  const status =
    c.status !== "open" ? "모집 마감" : c.always_open ? "상시 모집" : daysLeft <= 0 ? "오늘 마감" : `D-${daysLeft}`;
  const meta = [c.region?.flag ? `${c.region.flag} ${c.region.name}` : null, c.category ? `${c.category.emoji} ${c.category.name}` : null, c.promotion_type]
    .filter(Boolean)
    .join("  ·  ");
  const pillsFor = (withThumb: boolean) => [`보상 ${fmtP(c.point_amount)}`, `모집 ${c.recruit_count}명`, ...c.channels.slice(0, withThumb ? 2 : 3)];
  const pills = pillsFor(false);
  const title = c.title.length > 44 ? `${c.title.slice(0, 43)}…` : c.title;

  // 서브셋에 들어갈 글자만 모아 폰트 요청 (작게 유지)
  const text = [title, c.business_name, meta, status, ...pills, "루비AI 체험단 모집 luby.im"].join("");
  const [bold, regular] = await Promise.all([loadFont(text, 700), loadFont(text, 400)]);
  const fonts = [
    ...(bold ? [{ name: "NotoKR", data: bold, weight: 700 as const, style: "normal" as const }] : []),
    ...(regular ? [{ name: "NotoKR", data: regular, weight: 400 as const, style: "normal" as const }] : []),
  ];

  const thumb = c.thumbnail_url && /^https?:\/\//.test(c.thumbnail_url) ? c.thumbnail_url : null;

  const card = (withThumb: boolean) => (
    <div
      style={{
        width: 1200,
        height: 630,
        display: "flex",
        background: "#050505",
        color: "#ffffff",
        fontFamily: "NotoKR, sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* 핑크 글로우 */}
      <div style={{ position: "absolute", right: -160, bottom: -220, width: 620, height: 620, borderRadius: 9999, background: "radial-gradient(circle, rgba(255,42,167,0.45) 0%, rgba(255,42,167,0) 65%)", display: "flex" }} />
      <div style={{ position: "absolute", left: -200, top: -260, width: 520, height: 520, borderRadius: 9999, background: "radial-gradient(circle, rgba(255,42,167,0.18) 0%, rgba(255,42,167,0) 65%)", display: "flex" }} />

      {/* 본문 */}
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "56px 64px", width: withThumb ? 760 : 1200, height: 630 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 24, fontWeight: 700, letterSpacing: -0.5 }}>
          <div style={{ width: 14, height: 14, borderRadius: 9999, background: "#ff2aa7", display: "flex" }} />
          <span>루비AI 체험단 모집</span>
          <span style={{ marginLeft: 10, padding: "6px 16px", borderRadius: 9999, background: c.status === "open" ? "rgba(255,42,167,0.18)" : "rgba(255,255,255,0.08)", color: c.status === "open" ? "#ff8ed5" : "#9e9ea8", fontSize: 20 }}>{status}</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 26, color: "#9e9ea8", fontWeight: 400 }}>{meta}</div>
          <div style={{ fontSize: withThumb ? 54 : 64, fontWeight: 700, lineHeight: 1.15, letterSpacing: -1.5, display: "flex", lineClamp: 2, wordBreak: "keep-all" }}>{title}</div>
          <div style={{ fontSize: 30, color: "#d4d4dc", fontWeight: 400 }}>{c.business_name}</div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          {pillsFor(withThumb).map((p, i) => (
            <div key={i} style={{ display: "flex", padding: "10px 20px", borderRadius: 9999, border: "1.5px solid rgba(255,255,255,0.16)", background: i === 0 ? "#ff2aa7" : "rgba(255,255,255,0.05)", color: "#fff", fontSize: 23, fontWeight: i === 0 ? 700 : 400 }}>{p}</div>
          ))}
        </div>
      </div>

      {withThumb && thumb && (
        <div style={{ position: "absolute", right: 64, top: 56, width: 360, height: 518, borderRadius: 32, overflow: "hidden", display: "flex", border: "1.5px solid rgba(255,255,255,0.12)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={thumb} alt="" width={360} height={518} style={{ objectFit: "cover", width: 360, height: 518 }} />
        </div>
      )}

      <div style={{ position: "absolute", right: 64, bottom: 40, fontSize: 20, color: "#6b6b76", display: withThumb ? "none" : "flex" }}>luby.im</div>
    </div>
  );

  try {
    return new ImageResponse(card(!!thumb), { width: 1200, height: 630, fonts, headers: FALLBACK_HEADERS });
  } catch {
    // 원격 썸네일 로드 실패 등 → 썸네일 없는 카드로 재시도
    return new ImageResponse(card(false), { width: 1200, height: 630, fonts, headers: FALLBACK_HEADERS });
  }
}
