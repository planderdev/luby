"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ScrollText, X } from "lucide-react";
import type { Locale } from "@/lib/i18n";

/**
 * 이용약관 개정 공지(약관 제3조 — 시행 7일 전 공지). 2026-10-30 시행, 시행 후 1주일(11-06)까지 대시보드 상단에 띄운다.
 * '닫기'를 누르면 이 기기에서는 다시 띄우지 않는다(localStorage). 다음 개정 때는 KEY·날짜·문구를 바꾼다.
 */
const KEY = "luby:terms-notice-20261030";
const SHOW_UNTIL = new Date("2026-11-07T00:00:00+09:00").getTime();

const COPY: Record<Locale, { text: string; link: string; close: string }> = {
  ko: { text: "이용약관이 2026년 10월 30일부터 바뀌어요 — 결제 방식(단건·월 구독) 안내와 월 구독(정기결제) 조항이 새로 들어갑니다.", link: "자세히 보기", close: "닫기" },
  en: { text: "Our Terms of Service change on October 30, 2026 — adding payment options (one-time or monthly subscription) and a new monthly subscription (recurring payment) article.", link: "Read more", close: "Close" },
  zh: { text: "服务条款将于2026年10月30日修订——新增付款方式（单次·月度订阅）说明及月度订阅（定期扣款）条款。", link: "查看详情", close: "关闭" },
};

export function TermsUpdateBanner({ locale }: { locale: Locale }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (Date.now() >= SHOW_UNTIL) return;
    try {
      if (localStorage.getItem(KEY)) return;
    } catch {
      /* 저장소를 못 쓰면 매번 보여준다 */
    }
    setShow(true);
  }, []);
  if (!show) return null;
  const c = COPY[locale] ?? COPY.ko;
  const close = () => {
    try {
      localStorage.setItem(KEY, String(Date.now()));
    } catch {
      /* 무시 */
    }
    setShow(false);
  };
  return (
    <div className="mb-6 flex items-start gap-3 rounded-2xl border border-border bg-muted/40 px-5 py-3.5 text-sm">
      <ScrollText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <p className="min-w-0 flex-1 leading-relaxed">
        {c.text}{" "}
        <Link href={locale === "ko" ? "/terms" : `/terms?lang=${locale}`} className="font-medium underline underline-offset-2">
          {c.link}
        </Link>
      </p>
      <button type="button" onClick={close} aria-label={c.close} className="shrink-0 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
        <X className="size-4" />
      </button>
    </div>
  );
}
