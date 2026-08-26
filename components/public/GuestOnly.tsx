"use client";

import { useViewer } from "./viewer";

/** 비로그인 방문자에게만 보이는 영역. 확인 전에는 렌더하지 않아 로그인 사용자에게 깜빡이지 않는다. */
export function GuestOnly({ children }: { children: React.ReactNode }) {
  const { viewer, loading } = useViewer();
  if (loading || viewer) return null;
  return <>{children}</>;
}
