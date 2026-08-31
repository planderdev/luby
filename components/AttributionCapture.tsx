"use client";

import { useEffect } from "react";
import { captureAttribution } from "@/lib/attribution";

/** 공개 페이지 도착 시 첫 터치(UTM·유입원)를 저장한다. 렌더 없음 */
export function AttributionCapture() {
  useEffect(() => {
    captureAttribution();
  }, []);
  return null;
}
