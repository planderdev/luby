"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * 공개 페이지에서 "지금 보는 사람이 누구인지"를 브라우저에서 확인한다.
 *
 * 서버 렌더에서 쿠키를 읽으면 Next 가 페이지를 동적으로 판정해 CDN 캐시(no-store)가 꺼진다.
 * 공개 페이지는 정적으로 캐시되는 편이 훨씬 빠르므로, 로그인 여부에 따라 달라지는 작은 UI만
 * 하이드레이션 이후 이 훅으로 바꾼다. 결과는 모듈 단위로 캐시해 페이지당 1회만 조회한다.
 */
export type Viewer = { id: string; role: "advertiser" | "influencer" | "operator" } | null;

let cached: Promise<Viewer> | null = null;

async function fetchViewer(): Promise<Viewer> {
  try {
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;
    if (!user) return null;
    const { data } = await supabase.from("profiles").select("id, role").eq("id", user.id).maybeSingle();
    if (!data) return null;
    return { id: data.id, role: data.role as NonNullable<Viewer>["role"] };
  } catch {
    return null; // 비로그인·네트워크 오류는 "손님"으로 취급
  }
}

export function useViewer(): { viewer: Viewer; loading: boolean } {
  const [viewer, setViewer] = useState<Viewer>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    cached ??= fetchViewer();
    cached.then((v) => {
      if (!alive) return;
      setViewer(v);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);
  return { viewer, loading };
}

/**
 * 추천 링크(?ref=)를 브라우저에서 읽는다.
 * 서버에서 searchParams 를 읽으면 페이지가 동적으로 판정돼 CDN 캐시가 꺼지므로,
 * ref 는 이 훅으로만 쓴다(클릭·공유는 모두 하이드레이션 이후에 일어난다).
 */
export function useRefParam(): string | null {
  const [ref, setRef] = useState<string | null>(null);
  useEffect(() => {
    try {
      const v = new URLSearchParams(window.location.search).get("ref");
      if (v && /^[0-9a-f-]{36}$/.test(v)) setRef(v);
    } catch {
      /* 무시 */
    }
  }, []);
  return ref;
}
