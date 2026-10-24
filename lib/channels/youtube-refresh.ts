/**
 * 유튜브 채널 통계 주간 갱신(pg_cron channel-stats-refresh → /api/cron/channel-stats).
 * ① 한 번도 못 가져온 유튜브 채널(external_id 없음)은 주소로 조회해 채우고 ② 가져온 적 있는 채널은 id 로 50개씩 묶어 갱신.
 * 크리에이터가 숫자를 고쳤어도(stats_source=self) 유튜브는 공개 통계가 기준이라 다시 'api' 로 덮는다.
 */
import type { YouTubeChannel, YouTubeResult } from "./youtube";

export type RefreshRow = { id: string; url: string; external_id: string | null };
export type RefreshDeps = {
  rows: () => Promise<RefreshRow[]>;
  byUrl: (url: string) => Promise<YouTubeResult>;
  byIds: (ids: string[]) => Promise<Map<string, YouTubeChannel>>;
  save: (id: string, c: YouTubeChannel) => Promise<void>;
};

export async function refreshYouTubeChannels(deps: RefreshDeps) {
  const rows = await deps.rows();
  const s = { checked: rows.length, updated: 0, missing: 0 };
  const known = rows.filter((r) => r.external_id);
  const found = await deps.byIds(known.map((r) => r.external_id!));
  for (const r of known) {
    const c = found.get(r.external_id!);
    if (c) {
      await deps.save(r.id, c);
      s.updated++;
    } else s.missing++;
  }
  for (const r of rows.filter((x) => !x.external_id).slice(0, 50)) {
    const res = await deps.byUrl(r.url);
    if (res.ok) {
      await deps.save(r.id, res.channel);
      s.updated++;
    } else s.missing++;
  }
  return s;
}
