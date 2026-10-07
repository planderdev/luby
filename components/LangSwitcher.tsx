import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";

/** 인증 화면 상단 KR/EN/CN — 현재 경로에 ?lang= 만 바꿔 단다(나머지 쿼리 유지). 선택은 LangSync 가 쿠키로 굳힌다 */
export function LangSwitcher({ locale, pathname, query }: { locale: Locale; pathname: string; query?: Record<string, string | undefined> }) {
  const base = Object.entries(query ?? {}).filter(([k, v]) => k !== "lang" && v != null && v !== "") as [string, string][];
  const href = (l: Locale) => {
    const q = new URLSearchParams(base);
    q.set("lang", l); // ko 도 명시 — 쿠키에 다른 언어가 남아 있어도 KR 로 돌아올 수 있게
    const s = q.toString();
    return `${pathname}${s ? `?${s}` : ""}`;
  };
  return (
    <nav aria-label="language" className="flex items-center gap-1 rounded-full border border-border p-0.5 text-[11px]">
      {(["ko", "en", "zh"] as Locale[]).map((l) => (
        <Link key={l} href={href(l)} hrefLang={l} className={`rounded-full px-2 py-0.5 ${l === locale ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}>
          {l === "ko" ? "KR" : l === "en" ? "EN" : "CN"}
        </Link>
      ))}
    </nav>
  );
}
