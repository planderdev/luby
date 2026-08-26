"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PublicShareButton } from "@/components/PublicShareButton";
import { useRefParam, useViewer } from "./viewer";

type Labels = { signup: string; apply: string; dashboard: string; haveAccount: string; login: string };

/**
 * 공개 캠페인 페이지의 응모 CTA — 로그인 여부·역할에 따라 문구와 목적지가 달라진다.
 * 서버에서 쿠키를 읽지 않기 위해 이 조각만 클라이언트에서 판단한다.
 */
export function CampaignCta({ dashboardHref, loginHref, labels, showHint }: { dashboardHref: string; loginHref: string; labels: Labels; showHint: boolean }) {
  const { viewer } = useViewer();
  const refId = useRefParam();
  const refQ = refId ? `&ref=${refId}` : "";
  const href = viewer ? dashboardHref : `/signup?role=influencer&redirect=${encodeURIComponent(dashboardHref)}${refQ}`;
  const label = viewer ? (viewer.role === "influencer" ? labels.apply : labels.dashboard) : labels.signup;
  return (
    <>
      <Link href={href} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background">
        {label} <ArrowRight className="size-4" />
      </Link>
      {!viewer && showHint && (
        <p className="mt-3 text-center text-xs text-muted-foreground">
          {labels.haveAccount} <Link href={loginHref} className="underline underline-offset-2">{labels.login}</Link>
        </p>
      )}
    </>
  );
}

/** 공유 버튼 — 크리에이터가 보면 본인 추천 링크(?ref=)로 공유된다 */
export function CampaignShareButton({ basePath, title, label, copiedLabel }: { basePath: string; title: string; label: string; copiedLabel: string }) {
  const { viewer } = useViewer();
  const refId = useRefParam();
  const ref = viewer?.role === "influencer" ? viewer.id : refId;
  return <PublicShareButton title={title} path={`${basePath}${ref ? `?ref=${ref}` : ""}`} label={label} copiedLabel={copiedLabel} />;
}
