import Link from "next/link";
import { Calendar, Users } from "lucide-react";

const STATUS_LABEL: Record<string, { label: string; tone: "neutral" | "active" | "muted" | "ink" }> = {
  draft: { label: "초안", tone: "muted" },
  pending_approval: { label: "검수중", tone: "neutral" },
  open: { label: "모집중", tone: "active" },
  closed: { label: "마감", tone: "muted" },
  completed: { label: "완료", tone: "muted" },
  cancelled: { label: "취소", tone: "muted" },
};

const TONE_CLASS: Record<string, string> = {
  active: "bg-accent-soft text-accent-ink",
  neutral: "bg-muted text-foreground",
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
  regionFlag,
  regionName,
  categoryEmoji,
  categoryName,
}: {
  id: string;
  title: string;
  businessName: string;
  status: string;
  thumbnail: string | null;
  recruitStart: string;
  recruitEnd: string;
  recruitCount: number;
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
        {thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumbnail} alt={title} className="size-full object-cover" />
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
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {regionFlag} {regionName} · {categoryEmoji} {categoryName}
          </div>
          <h3 className="mt-2 line-clamp-2 text-base font-semibold tracking-tight">{title}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{businessName}</p>
        </div>
        <div className="mt-auto flex items-center gap-4 border-t border-border pt-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Calendar className="size-3.5" />
            {fmtDate(recruitStart)} ~ {fmtDate(recruitEnd)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Users className="size-3.5" />
            {recruitCount}명
          </span>
        </div>
      </div>
    </Link>
  );
}
