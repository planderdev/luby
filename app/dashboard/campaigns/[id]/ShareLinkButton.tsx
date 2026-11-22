"use client";

import { ShareMenu, type ShareLink } from "@/components/share/ShareMenu";
import { EXTRA_CONTENT_LANGS } from "@/lib/i18n/content-langs";

/**
 * 공개 캠페인 페이지 공유 — 언어별 링크 복사 + SNS 바로 보내기 (SNS·샤오홍슈·카톡 공유용).
 * translated: AI 번역이 준비된 언어 코드(campaign_translations.locale). 영문·중문은 없으면 '번역 준비 중'으로 보이고,
 * 추가 언어(일본어·번체·태국어·베트남어·인도네시아어)는 번역본이 있을 때만 목록에 나온다.
 * refId: 크리에이터 추천 링크(?ref=) — 있으면 포스터·안내 문구가 추천용으로 바뀐다.
 */
export function ShareLinkButton({
  campaignId,
  title = "",
  refId = null,
  buttonLabel = "공유하기",
  translated,
  variant = "primary",
  align = "right",
  locale = "ko",
}: {
  campaignId: string;
  title?: string;
  refId?: string | null;
  buttonLabel?: string;
  translated?: string[];
  variant?: "primary" | "outline" | "icon";
  align?: "left" | "right";
  /** 메뉴 문구 언어 (크리에이터 화면은 en·zh 가능) */
  locale?: "ko" | "en" | "zh";
}) {
  const refHint = { ko: "내 링크로 가입한 친구가 첫 체험을 완료하면 500P (월 5명)", en: "You earn 500P when a friend who joins via your link completes their first campaign (up to 5 a month)", zh: "通过你的链接注册的朋友完成首次体验后，你可获得 500P（每月最多 5 人）" }[locale];
  const q = refId ? `?ref=${refId}` : "?src=link";
  const badge = (code: string): ShareLink["badge"] => (translated ? (translated.includes(code) ? "ready" : "pending") : undefined);
  const links: ShareLink[] = [
    { code: "ko", label: "한국어 (KR)", path: `/c/${campaignId}${q}` },
    { code: "en", label: "English (EN)", path: `/en/c/${campaignId}${q}`, badge: badge("en") },
    { code: "zh", label: "简体中文 (CN)", path: `/zh/c/${campaignId}${q}`, badge: badge("zh") },
    ...EXTRA_CONTENT_LANGS.filter((l) => translated?.includes(l.code)).map((l) => ({ code: l.code, label: l.native, path: `/c/${campaignId}/${l.slug}${q}`, badge: "ready" as const })),
  ];
  return (
    <ShareMenu
      title={title}
      links={links}
      label={buttonLabel}
      trigger={variant}
      align={align}
      uiLocale={locale}
      footer={
        <div className="border-t border-border">
          {!refId && (
            <a href={`/dashboard/campaigns/${campaignId}/poster`} className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs hover:bg-muted">
              매장용 QR 포스터 <span className="text-[10px] text-muted-foreground">A4 인쇄</span>
            </a>
          )}
          <p className="px-3 pb-1.5 pt-1 text-[10px] leading-relaxed text-muted-foreground">
            {refId ? refHint : "해외 SNS엔 그 나라 언어 링크를 쓰세요 — 제목·미션이 그 언어로 번역돼 보여요"}
          </p>
        </div>
      }
    />
  );
}
