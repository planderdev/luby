"use client";

import { useEffect, useMemo, useRef } from "react";
import { chrome, chromeHeadLinks } from "./chrome-fragment";
import { useViewer } from "@/components/public/viewer";
import type { Locale } from "@/lib/i18n";

/**
 * 공개 체험단 페이지(/c·/creators·/p)에 랜딩 시안과 같은 헤더·전체화면 메뉴·푸터를 입힌다 (2026-10-06 A안).
 * 마크업은 동기화 스크립트가 시안에서 추출한 정적 조각(chrome-fragment)이고, 시안 JS 번들(Lenis·GSAP·페이지 전환·
 * i18n) 은 싣지 않는다 — 동적 React 페이지와 충돌하기 때문. 메뉴 열기/닫기·언어 메뉴·스크롤 상태는 여기서 흉내낸다.
 * innerHTML 영역은 React 가 관리하지 않으므로 DOM 을 직접 만져도 재조정 충돌이 없다.
 */
type Props = {
  locale: Locale;
  /** 이 페이지의 언어별 경로 — 언어 메뉴가 홈이 아니라 같은 페이지의 다른 언어로 간다 */
  langHrefs: Record<Locale, string>;
  loginHref?: string;
  joinHref?: string;
  /** 로그인 상태면 '로그인' 자리에 보여줄 문구 */
  dashboardLabel: string;
};

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");

function withLinks(html: string, p: Props) {
  let h = html;
  for (const code of ["ko", "en", "zh"] as Locale[]) {
    h = h.replace(
      new RegExp(`(<a role="menuitemradio" data-lang-link="${code}")( aria-current="true")? href="[^"]*"`, "g"),
      `$1${code === p.locale ? ' aria-current="true"' : ""} href="${esc(p.langHrefs[code])}"`
    );
  }
  if (p.loginHref) h = h.replace(/href="\/login"/g, `href="${esc(p.loginHref)}"`);
  if (p.joinHref) h = h.replace(/href="\/signup\?role=influencer"/g, `href="${esc(p.joinHref)}"`);
  return h;
}

export function LreChrome(p: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const { viewer } = useViewer();
  const { locale, loginHref, joinHref, dashboardLabel } = p;
  const { ko, en, zh } = p.langHrefs;
  // React 19 는 dangerouslySetInnerHTML 의 객체 참조가 바뀌면 문자열이 같아도 innerHTML 을 다시 쓴다(React 18 과 다름).
  // 매 렌더마다 { __html } 을 새로 만들면 useViewer 재렌더 때 메뉴 DOM 이 통째로 교체돼 아래 효과가 잡은 노드가 떨어져 나간다
  // (2026-10-06 실제 발생) — 객체 자체를 메모이즈한다.
  const inner = useMemo(
    () => ({ __html: chromeHeadLinks + "\n" + withLinks(chrome[locale].header + "\n" + chrome[locale].menu, { locale, langHrefs: { ko, en, zh }, loginHref, joinHref, dashboardLabel }) }),
    [locale, ko, en, zh, loginHref, joinHref, dashboardLabel]
  );

  // 로그인 상태면 '로그인' → 대시보드, '무료로 시작하기' 는 숨긴다 (TopBarAuthLink 와 같은 규칙)
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    root.querySelectorAll<HTMLAnchorElement>(".site-header__login, .global-menu__login").forEach((a) => {
      if (viewer) {
        a.dataset.orig ??= a.innerHTML;
        a.dataset.origHref ??= a.getAttribute("href") ?? "/login";
        a.textContent = dashboardLabel;
        a.setAttribute("href", "/dashboard");
      } else if (a.dataset.orig) {
        a.innerHTML = a.dataset.orig;
        a.setAttribute("href", a.dataset.origHref ?? "/login");
      }
    });
    root.querySelectorAll<HTMLElement>(".site-header__contact, .global-menu__join").forEach((el) => {
      el.style.display = viewer ? "none" : "";
    });
  }, [viewer, dashboardLabel, inner]);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const header = root.querySelector<HTMLElement>(".site-header");
    const menu = root.querySelector<HTMLElement>(".global-menu");
    const toggle = root.querySelector<HTMLButtonElement>(".menu-toggle");

    const onScroll = () => header?.classList.toggle("is-scrolled", window.scrollY > 24);
    onScroll();

    const setMenu = (open: boolean) => {
      if (!menu || !toggle) return;
      menu.classList.toggle("is-open", open);
      menu.setAttribute("aria-hidden", open ? "false" : "true");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      document.body.classList.toggle("is-menu-open", open);
    };
    const closeLang = () =>
      root.querySelectorAll(".language-dropdown.is-open").forEach((d) => {
        d.classList.remove("is-open");
        d.querySelector("[data-language-trigger]")?.setAttribute("aria-expanded", "false");
      });
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest(".menu-toggle")) {
        setMenu(!menu?.classList.contains("is-open"));
        return;
      }
      if (t.closest(".menu-close") || t.closest(".global-menu__link") || t.closest(".global-menu__actions a")) setMenu(false);
      const trigger = t.closest("[data-language-trigger]");
      if (trigger) {
        e.stopPropagation(); // document 의 바깥 클릭 닫기가 바로 되돌리지 않게
        const dd = trigger.closest(".language-dropdown");
        const open = !dd?.classList.contains("is-open");
        closeLang();
        dd?.classList.toggle("is-open", open);
        trigger.setAttribute("aria-expanded", open ? "true" : "false");
      }
    };
    const onDocClick = () => closeLang();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenu(false);
        closeLang();
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    root.addEventListener("click", onClick);
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", onScroll);
      root.removeEventListener("click", onClick);
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKey);
      document.body.classList.remove("is-menu-open");
    };
  }, [inner]);

  return <div ref={ref} className="lre-root lre-chrome" data-lang={locale} dangerouslySetInnerHTML={inner} />;
}

const FOOTER_HTML = { ko: { __html: chrome.ko.footer }, en: { __html: chrome.en.footer }, zh: { __html: chrome.zh.footer } } as const;

export function LreChromeFooter({ locale }: { locale: Locale }) {
  return <div className="lre-root lre-chrome" data-lang={locale} dangerouslySetInnerHTML={FOOTER_HTML[locale]} />;
}
