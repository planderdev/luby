"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Copy, Send, Share2 } from "lucide-react";
import { shareTargets } from "@/lib/share-targets";

export type ShareLink = { code: string; label: string; path: string; badge?: "ready" | "pending" };
type UiLocale = "ko" | "en" | "zh";

const UI: Record<UiLocale, { copy: string; copied: string; native: string; sns: string; hint: string; ready: string; pending: string; language: string }> = {
  ko: { copy: "링크 복사", copied: "복사됨", native: "다른 앱으로 보내기", sns: "SNS로 보내기", hint: "카카오톡·위챗·샤오홍슈는 링크를 복사해 붙여 넣으세요.", ready: "번역됨", pending: "번역 준비 중", language: "보낼 언어" },
  en: { copy: "Copy link", copied: "Copied", native: "Share via another app", sns: "Send to", hint: "For KakaoTalk, WeChat or Xiaohongshu, copy the link and paste it.", ready: "Translated", pending: "Translating", language: "Language" },
  zh: { copy: "复制链接", copied: "已复制", native: "通过其他应用分享", sns: "发送到", hint: "微信、小红书、KakaoTalk 请复制链接后粘贴。", ready: "已翻译", pending: "翻译准备中", language: "语言" },
};

const TRIGGER: Record<"primary" | "outline" | "icon", string> = {
  primary: "inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-xs font-medium text-background hover:bg-foreground/90",
  outline: "inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-2 text-xs font-medium hover:bg-muted",
  icon: "inline-flex size-9 items-center justify-center rounded-full border border-border bg-background/95 text-foreground shadow-sm backdrop-blur hover:bg-muted",
};

/**
 * 공유 메뉴 — 언어별 링크 복사 + SNS 바로 보내기 + (지원 기기) 기기 공유창.
 * links 가 여러 개면 언어를 고른 뒤 그 언어 링크로 보낸다. 주소는 클릭 시점에 window.location.origin 으로 만든다.
 */
export function ShareMenu({
  title,
  links,
  label,
  trigger = "outline",
  uiLocale = "ko",
  align = "right",
  footer,
}: {
  title: string;
  links: ShareLink[];
  label: string;
  trigger?: "primary" | "outline" | "icon";
  uiLocale?: UiLocale;
  align?: "left" | "right";
  footer?: React.ReactNode;
}) {
  const t = UI[uiLocale];
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(links[0]?.code ?? "");
  const [copied, setCopied] = useState<string | null>(null);
  const [canNative, setCanNative] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setCanNative(typeof (navigator as Navigator & { share?: unknown }).share === "function");
    const onDown = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = links.find((l) => l.code === selected) ?? links[0];
  const urlOf = (l: ShareLink) => `${window.location.origin}${l.path}`;

  async function copy(l: ShareLink) {
    setSelected(l.code);
    const url = urlOf(l);
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(l.code);
    setTimeout(() => setCopied(null), 1500);
  }
  async function nativeShare() {
    if (!current) return;
    try {
      await (navigator as Navigator & { share: (d: { title: string; url: string }) => Promise<void> }).share({ title, url: urlOf(current) });
      setOpen(false);
    } catch {
      /* 사용자가 닫음 */
    }
  }
  function openTarget(key: string) {
    if (!current) return;
    const target = shareTargets(urlOf(current), title).find((x) => x.key === key);
    if (target) window.open(target.href, "_blank", "noopener,noreferrer");
  }

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={trigger === "icon" ? label : undefined}
        className={TRIGGER[trigger]}
      >
        <Share2 className={trigger === "icon" ? "size-4" : "size-3.5"} />
        {trigger !== "icon" && (
          <>
            {label}
            <ChevronDown className="size-3" />
          </>
        )}
      </button>
      {open && (
        <div
          role="menu"
          className={`absolute z-30 mt-2 w-64 rounded-2xl border border-border bg-background p-1.5 text-left shadow-lg ${align === "right" ? "right-0" : "left-0"}`}
        >
          {links.length > 1 && <div className="px-3 pb-1 pt-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{t.language}</div>}
          <div className={links.length > 6 ? "max-h-56 overflow-y-auto" : ""}>
            {links.map((l) => (
              <button
                key={l.code}
                type="button"
                role="menuitem"
                onClick={() => copy(l)}
                className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs hover:bg-muted ${links.length > 1 && l.code === current?.code ? "bg-muted/70" : ""}`}
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate">{links.length > 1 ? l.label : t.copy}</span>
                  {l.badge === "ready" && <span className="shrink-0 rounded-full bg-success-soft px-1.5 py-px text-[10px] font-medium text-success">{t.ready}</span>}
                  {l.badge === "pending" && <span className="shrink-0 rounded-full bg-muted px-1.5 py-px text-[10px] text-muted-foreground">{t.pending}</span>}
                </span>
                {copied === l.code ? (
                  <span className="inline-flex shrink-0 items-center gap-1 text-[10px] text-success"><Check className="size-3.5" />{t.copied}</span>
                ) : (
                  <span className="inline-flex shrink-0 items-center gap-1 text-[10px] text-muted-foreground"><Copy className="size-3" />{links.length > 1 ? t.copy : ""}</span>
                )}
              </button>
            ))}
          </div>

          <div className="mt-1 border-t border-border px-3 pb-2 pt-2.5">
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {t.sns}
              {links.length > 1 && current ? ` · ${current.label}` : ""}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {shareTargets("", "").map((x) => (
                <button
                  key={x.key}
                  type="button"
                  role="menuitem"
                  onClick={() => openTarget(x.key)}
                  className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-medium hover:bg-muted"
                >
                  {x.label}
                </button>
              ))}
            </div>
            {canNative && (
              <button type="button" role="menuitem" onClick={nativeShare} className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-medium underline underline-offset-4">
                <Send className="size-3" />
                {t.native}
              </button>
            )}
            <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">{t.hint}</p>
          </div>
          {footer}
        </div>
      )}
    </div>
  );
}
