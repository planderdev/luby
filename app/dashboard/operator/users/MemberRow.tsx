"use client";

import { useState, useTransition } from "react";
import { Check, X, Loader2, Building2, Radio } from "lucide-react";
import { approveUser } from "../actions";

type Business = {
  companyName: string | null;
  advertiserKind?: "brand" | "agency" | null;
  businessNumber: string | null;
  businessType: string | null;
  representative: string | null;
};

type Influencer = {
  region: string | null;
  bio: string | null;
  points: number;
  channelCount: number;
  totalFollowers: number;
};

export function MemberRow({
  profileId,
  name,
  email,
  phone,
  role,
  approved,
  createdAt,
  business,
  influencer,
}: {
  profileId: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  approved: boolean;
  createdAt: string;
  business: Business | null;
  influencer: Influencer | null;
}) {
  const [isApproved, setIsApproved] = useState(approved);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function decide(decision: "approve" | "reject") {
    setError(null);
    startTransition(async () => {
      try {
        const result = await approveUser(profileId, decision);
        if (result.ok) setIsApproved(decision === "approve");
        else setError(result.error);
      } catch (e) {
        setError(e instanceof Error ? e.message : "처리 중 오류가 발생했습니다.");
      }
    });
  }

  const joined = new Date(createdAt).toLocaleDateString("ko-KR", {
    year: "2-digit",
    month: "numeric",
    day: "numeric",
  });

  return (
    <div className="rounded-2xl glass-card p-4 lg:p-5">
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background">
          {name.slice(0, 1).toUpperCase()}
        </div>

        <div className="min-w-0 flex-1">
          {/* 이름 + 배지 줄 */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">{name}</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px]">
              {role === "advertiser" ? "광고주" : "인플루언서"}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                isApproved ? "bg-accent-soft text-accent-ink" : "bg-muted text-muted-foreground"
              }`}
            >
              {isApproved ? "승인됨" : "승인 대기"}
            </span>
            <span className="text-[11px] text-muted-foreground">가입 {joined}</span>
          </div>

          {/* 연락처 줄 */}
          <div className="mt-1 text-xs text-muted-foreground">
            {email}
            {phone && ` · ${phone}`}
          </div>

          {/* 역할별 검수 정보 */}
          {business && (
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl bg-muted/50 px-3.5 py-2.5 text-xs">
              <span className="inline-flex items-center gap-1.5 font-medium">
                <Building2 className="size-3.5 text-muted-foreground" />
                {business.companyName ?? "—"}
                {business.advertiserKind === "agency" && (
                  <span className="rounded-full border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    대행사
                  </span>
                )}
              </span>
              <span className="text-muted-foreground">
                사업자번호{" "}
                <span className={business.businessNumber ? "font-mono text-foreground" : ""}>
                  {business.businessNumber ?? "미입력 ⚠"}
                </span>
              </span>
              {business.businessType && (
                <span className="text-muted-foreground">
                  {business.businessType === "corporation" ? "법인" : "개인"}
                </span>
              )}
              {business.representative && (
                <span className="text-muted-foreground">대표 {business.representative}</span>
              )}
            </div>
          )}
          {influencer && (
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl bg-muted/50 px-3.5 py-2.5 text-xs">
              <span className="inline-flex items-center gap-1.5 font-medium">
                <Radio className="size-3.5 text-muted-foreground" />
                채널 {influencer.channelCount}개
              </span>
              <span className="text-muted-foreground">
                총 팔로워 {influencer.totalFollowers.toLocaleString()}명
              </span>
              {influencer.region && <span className="text-muted-foreground">{influencer.region}</span>}
              <span className="text-muted-foreground">{influencer.points.toLocaleString()}P</span>
              {influencer.bio && (
                <span className="w-full truncate text-muted-foreground">“{influencer.bio}”</span>
              )}
            </div>
          )}
        </div>

        {/* 액션 */}
        <div className="flex shrink-0 gap-1.5">
          {isApproved ? (
            <button
              onClick={() => decide("reject")}
              disabled={pending}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-4 py-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
            >
              {pending ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-3.5" />}
              승인 해제
            </button>
          ) : (
            <>
              <button
                onClick={() => decide("reject")}
                disabled={pending}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-4 py-2 text-xs hover:bg-muted disabled:opacity-50"
              >
                {pending ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-3.5" />}
                반려
              </button>
              <button
                onClick={() => decide("approve")}
                disabled={pending}
                className="inline-flex items-center gap-1 rounded-full bg-foreground px-4 py-2 text-xs font-medium text-background disabled:opacity-50"
              >
                {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                승인
              </button>
            </>
          )}
        </div>
      </div>
      {error && (
        <div className="mt-2 rounded-xl border border-accent/30 bg-accent-soft px-3 py-2 text-xs text-accent-ink">
          {error}
        </div>
      )}
    </div>
  );
}
