/**
 * YouTube Data API v3 — 채널 공개 통계(구독자·조회수·영상 수)와 채널 설명(본인 인증 코드 확인)을 읽는다.
 * API 키(YOUTUBE_API_KEY)만 쓰고 사용자 로그인은 필요 없다. channels.list 1회 = 1 할당량(무료 하루 10,000).
 * 키가 없으면 youtubeConfigured() = false → 유튜브도 다른 채널처럼 캡처·운영자 확인으로 처리한다.
 */
const API = "https://www.googleapis.com/youtube/v3/channels";

export function youtubeConfigured(): boolean {
  return !!process.env.YOUTUBE_API_KEY;
}

export type YouTubeRef = { kind: "id" | "handle" | "user"; value: string };

/** 채널 주소 → 조회 방식. /c/이름 같은 예전 맞춤 주소·영상 주소는 지원하지 않아 null */
export function parseYouTubeUrl(raw: string): YouTubeRef | null {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  if (!/(^|\.)youtube\.com$/i.test(u.hostname)) return null;
  const parts = u.pathname.split("/").filter(Boolean).map((p) => decodeURIComponent(p));
  if (parts[0]?.startsWith("@") && parts[0].length > 1) return { kind: "handle", value: parts[0] };
  if (parts[0] === "channel" && /^UC[\w-]{22}$/.test(parts[1] ?? "")) return { kind: "id", value: parts[1] };
  if (parts[0] === "user" && parts[1]) return { kind: "user", value: parts[1] };
  return null;
}

export type YouTubeChannel = {
  id: string;
  title: string;
  description: string;
  /** 구독자 수 비공개 채널이면 null */
  subscribers: number | null;
  views: number;
  videos: number;
};

type ApiItem = {
  id: string;
  snippet?: { title?: string; description?: string };
  statistics?: { subscriberCount?: string; hiddenSubscriberCount?: boolean; viewCount?: string; videoCount?: string };
};

function toChannel(it: ApiItem): YouTubeChannel {
  const s = it.statistics ?? {};
  return {
    id: it.id,
    title: it.snippet?.title ?? "",
    description: it.snippet?.description ?? "",
    subscribers: s.hiddenSubscriberCount ? null : Number(s.subscriberCount ?? 0),
    views: Number(s.viewCount ?? 0),
    videos: Number(s.videoCount ?? 0),
  };
}

export type YouTubeResult = { ok: true; channel: YouTubeChannel } | { ok: false; error: "no_key" | "unsupported_url" | "not_found" | "api_error"; detail?: string };

async function call(params: Record<string, string>): Promise<{ ok: true; items: ApiItem[] } | { ok: false; detail: string }> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return { ok: false, detail: "no key" };
  const qs = new URLSearchParams({ part: "snippet,statistics", ...params, key });
  try {
    const res = await fetch(`${API}?${qs}`, { cache: "no-store" });
    const body = (await res.json().catch(() => null)) as { items?: ApiItem[]; error?: { message?: string } } | null;
    if (!res.ok) return { ok: false, detail: body?.error?.message ?? `HTTP ${res.status}` };
    return { ok: true, items: body?.items ?? [] };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : String(e) };
  }
}

export async function fetchYouTubeChannel(url: string): Promise<YouTubeResult> {
  if (!youtubeConfigured()) return { ok: false, error: "no_key" };
  const ref = parseYouTubeUrl(url);
  if (!ref) return { ok: false, error: "unsupported_url" };
  const r = await call(ref.kind === "id" ? { id: ref.value } : ref.kind === "handle" ? { forHandle: ref.value } : { forUsername: ref.value });
  if (!r.ok) return { ok: false, error: "api_error", detail: r.detail };
  const it = r.items[0];
  return it ? { ok: true, channel: toChannel(it) } : { ok: false, error: "not_found" };
}

/** 주간 갱신용 — 채널 id 50개씩 묶어 조회 */
export async function fetchYouTubeChannelsByIds(ids: string[]): Promise<Map<string, YouTubeChannel>> {
  const out = new Map<string, YouTubeChannel>();
  for (let i = 0; i < ids.length; i += 50) {
    const r = await call({ id: ids.slice(i, i + 50).join(",") });
    if (r.ok) for (const it of r.items) out.set(it.id, toChannel(it));
  }
  return out;
}
