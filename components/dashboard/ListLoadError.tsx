import { AlertTriangle } from "lucide-react";

/** 목록을 불러오지 못했을 때 — 빈 목록으로 보여 주면 "결과가 없다"고 오해하게 된다 */
export function ListLoadError({ label = "목록" }: { label?: string }) {
  return (
    <div className="col-span-full rounded-3xl border border-border bg-background p-10 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-accent-soft">
        <AlertTriangle className="size-6 text-accent-ink" />
      </div>
      <p className="mt-4 text-sm font-medium">{label}을 불러오지 못했어요</p>
      <p className="mt-1 text-xs text-muted-foreground">
        일시적인 오류일 수 있어요. 새로고침하거나 필터를 초기화해 주세요. 계속되면 운영팀에 알려주세요.
      </p>
    </div>
  );
}
