"use client";

import { useEffect } from "react";
import { APP_LOCALE_COOKIE } from "@/lib/i18n/app-locale-shared";
import { htmlLangAttr, type Locale } from "@/lib/i18n/config";

/** 서버가 정한 앱 언어를 쿠키·<html lang> 에 맞춘다(1년). 언어 전환 링크(?lang=)로 들어온 선택을 다음 페이지에도 이어 준다. */
export function LangSync({ locale }: { locale: Locale }) {
  useEffect(() => {
    try {
      document.documentElement.lang = htmlLangAttr[locale];
      const cur = document.cookie.split("; ").find((c) => c.startsWith(`${APP_LOCALE_COOKIE}=`))?.split("=")[1];
      if (cur !== locale) document.cookie = `${APP_LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
    } catch {
      /* 쿠키 차단 환경 — 무시 */
    }
  }, [locale]);
  return null;
}
