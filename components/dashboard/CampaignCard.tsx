import Link from "next/link";
import { Calendar, Coins, Users, Inbox, CheckCircle2, Sparkles, Eye } from "lucide-react";

const STATUS_LABEL: Record<string, { label: string; tone: "success" | "warning" | "danger" | "muted" | "ink" }> = {
  draft: { label: "초안", tone: "muted" },
  pending_approval: { label: "검수중", tone: "warning" },
  open: { label: "모집중", tone: "success" },
  closed: { label: "마감", tone: "muted" },
  completed: { label: "완료", tone: "ink" },
  rejected: { label: "반려 · 수정 필요", tone: "danger" },
  cancelled: { label: "취소", tone: "danger" },
};

const TONE_CLASS: Record<string, string> = {
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  muted: "bg-muted text-muted-foreground",
  ink: "bg-foreground text-background",
};

function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function CampaignCard({
  id,
  title,
  businessName,
  status,
  thumbnail,
  recruitStart,
  recruitEnd,
  recruitCount,
  pointAmount,
  regionFlag,
  regionName,
  categoryEmoji,
  categoryName,
  badges = [],
  stats,
}: {
  id: string;
  title: string;
  businessName: string;
  status: string;
  thumbnail: string | null;
  recruitStart: string;
  recruitEnd: string;
  recruitCount: number;
  pointAmount?: number;
  /** 크리에이터 맞춤 배지: "응모함" | "내 분야" | "내 지역" */
  badges?: string[];
  /** 광고주·운영자 카드: 응모 집계 (크리에이터 뷰에서는 미전달) */
  stats?: { applied: number; pending: number; selected: number; approved: number; views?: number };
  regionFlag: string;
  regionName: string;
  categoryEmoji: string;
  categoryName: string;
}) {
  const statusInfo = STATUS_LABEL[status] ?? { label: status, tone: "muted" };

  return (
    <Link
      href={`/dashboard/campaigns/${id}`}
      className="group flex flex-col overflow-hidden rounded-3xl glass-card transition-colors hover:bg-muted/40"
    >
      <div className="relative aspect-[16/9] w-full bg-muted">
        {thumbnail || ["open", "closed", "completed"].includes(status) ? (
          // 썸네일 없으면 공개 상태에 한해 브랜드 OG 카드로 폴백 (공개 페이지·디렉터리와 동일)
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumbnail ?? `/api/og/campaign/${id}`} alt={title} loading="lazy" className={`size-full object-cover ${thumbnail ? "" : "object-left"}`} />
        ) : (
          <div className="flex size-full items-center justify-center">
            <span className="text-3xl opacity-40">{categoryEmoji || "🎯"}</span>
          </div>
        )}
        <span
          className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-medium ${TONE_CLASS[statusInfo.tone]}`}
        >
          {statusInfo.label}
        </span>
        {badges.length > 0 && (
          <div className="absolute right-3 top-3 flex flex-wrap justify-end gap-1">
            {badges.map((b) => (
              <span
                key={b}
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  b === "응모함"
                    ? "bg-foreground/85 text-background"
                    : "bg-accent text-white shadow-pink-sm"
                }`}
              >
                {b}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {regionFlag} {regionName} · {categoryEmoji} {categoryName}
          </div>
          <h3 className="mt-2 line-clamp-2 text-base font-semibold tracking-tight break-keep">{title}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{businessName}</p>
        </div>
        {stats && status !== "draft" && (
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            {stats.pending > 0 && (status === "open" || status === "closed") && (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 font-semibold text-accent-ink">
                <Sparkles className="size-3" /> 선정 대기 {stats.pending}
              </span>
            )}
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
              <Inbox className="size-3" /> 응모 {stats.applied}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
              <Users className="size-3" /> 선정 {stats.selected}/{recruitCount}
            </span>
            {(stats.views ?? 0) > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-muted-foreground" title="공개 페이지 조회 (공유 링크·QR·디렉터리)">
                <Eye className="size-3" /> 조회 {stats.views}
              </span>
            )}
            {stats.approved > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                <CheckCircle2 className="size-3" /> 승인 {stats.approved}
                {status === "completed" && typeof pointAmount === "number" && pointAmount > 0
                  ? ` · ${(stats.approved * pointAmount).toLocaleString()}P 지급`
                  : ""}
              </span>
            )}
          </div>
        )}
        <div className="mt-auto flex items-center gap-4 border-t border-border pt-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Calendar className="size-3.5" />
            {fmtDate(recruitStart)} ~ {fmtDate(recruitEnd)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Users className="size-3.5" />
            {recruitCount}명
          </span>
          {typeof pointAmount === "number" && pointAmount > 0 && (
            <span className="ml-auto inline-flex items-center gap-1 font-semibold text-accent-ink">
              <Coins className="size-3.5" />
              {pointAmount.toLocaleString()}P
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
