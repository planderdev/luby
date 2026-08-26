"use client";

import { useEffect, useState } from "react";
import { useViewer } from "@/components/public/viewer";
import type { NavGroup } from "@/components/docs/DocsSidebar";
import type { SearchItem } from "@/components/docs/DocsSearch";

/**
 * 운영자 전용 가이드 목차를 하이드레이션 이후에 덧붙인다.
 * (서버에서 쿠키를 읽지 않아야 /docs 가 CDN 에 캐시된다 — 로그인 사용자만 이 요청을 보낸다)
 */
type OperatorDocs = { groups: NavGroup[]; index: SearchItem[] };
const EMPTY: OperatorDocs = { groups: [], index: [] };
const cache = new Map<string, Promise<OperatorDocs>>();

export function useOperatorDocs(lang: string): OperatorDocs {
  const { viewer } = useViewer();
  const [docs, setDocs] = useState<OperatorDocs>(EMPTY);
  const isOperator = viewer?.role === "operator";

  useEffect(() => {
    if (!isOperator) return;
    let alive = true;
    if (!cache.has(lang)) {
      cache.set(
        lang,
        fetch(`/api/docs/nav?lang=${encodeURIComponent(lang)}`, { credentials: "same-origin" })
          .then((r) => (r.ok ? r.json() : EMPTY))
          .catch(() => EMPTY)
      );
    }
    cache.get(lang)!.then((d) => {
      if (alive) setDocs(d?.groups ? d : EMPTY);
    });
    return () => {
      alive = false;
    };
  }, [isOperator, lang]);

  return docs;
}
