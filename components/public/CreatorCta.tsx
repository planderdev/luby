"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useViewer } from "./viewer";

/**
 * 공개 크리에이터 프로필 CTA — 광고주·운영자는 초대, 본인은 설정, 손님은 가입.
 * (서버 쿠키 읽기를 없애기 위해 클라이언트에서 판단)
 */
export function CreatorCta({ creatorId, labels }: { creatorId: string; labels: { invite: string; mine: string; signup: string } }) {
  const { viewer } = useViewer();
  const dash = `/dashboard/creators/${creatorId}`;
  const cta = viewer
    ? viewer.role === "advertiser" || viewer.role === "operator"
      ? { href: dash, label: labels.invite }
      : viewer.id === creatorId
        ? { href: "/dashboard/settings#public", label: labels.mine }
        : null
    : { href: `/signup?role=advertiser&redirect=${encodeURIComponent(dash)}`, label: labels.signup };
  if (!cta) return null;
  return (
    <Link href={cta.href} className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-transform hover:scale-[1.02]">
      {cta.label} <ArrowRight className="size-4" />
    </Link>
  );
}
