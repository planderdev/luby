import { LreScripts } from "./LreScripts";

/**
 * 팀장님(안이슬) 랜딩 리뉴얼 시안(luby-re)의 페이지 공통 셸.
 *
 * 마크업은 시안 원본을 그대로 서버 렌더하고(수정은 scripts/luby-re-sync.mjs 의
 * 기계적 치환뿐), 연출은 시안의 vanilla JS 를 마운트 후 로드해 그대로 돌린다.
 * React 는 이 div 를 다시 건드리지 않으므로 시안 JS 의 DOM 변형과 충돌하지 않는다.
 */
export function LrePage({
  html,
  htmlBottom,
  bundle,
  children,
}: {
  html: string;
  htmlBottom?: string;
  bundle: string;
  children?: React.ReactNode;
}) {
  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: html }} />
      {children}
      {htmlBottom && <div dangerouslySetInnerHTML={{ __html: htmlBottom }} />}
      <LreScripts bundle={bundle} />
    </>
  );
}
