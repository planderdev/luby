"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { ThumbsDown, ThumbsUp } from "lucide-react";

/** 페이지 하단 "이 문서가 도움이 됐나요?" — 👍 즉시 전송, 👎 는 한 줄 의견(선택) 후 전송 */
type Labels = { q: string; yes: string; no: string; placeholder: string; cancel: string; send: string; thanks: string; error: string };
const KO: Labels = { q: "이 문서가 도움이 됐나요?", yes: "네", no: "아니요", placeholder: "무엇이 부족했나요? (선택, 500자)", cancel: "취소", send: "보내기", thanks: "의견 감사합니다. 더 나은 가이드를 만드는 데 쓸게요.", error: "전송에 실패했어요. 잠시 후 다시 시도해 주세요." };

export function DocFeedback({ labels = KO }: { labels?: Labels }) {
  const pathname = usePathname();
  const [state, setState] = useState<"idle" | "down" | "done" | "error">("idle");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  async function send(helpful: boolean, text?: string) {
    setBusy(true);
    try {
      const r = await fetch("/api/docs/feedback", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ path: pathname, helpful, comment: text }) });
      setState(r.ok ? "done" : "error");
    } catch {
      setState("error");
    } finally {
      setBusy(false);
    }
  }

  if (state === "done") return <p className="mt-10 rounded-2xl bg-muted/50 px-5 py-4 text-sm text-muted-foreground">{labels.thanks}</p>;
  if (state === "error") return <p className="mt-10 text-sm text-muted-foreground">{labels.error}</p>;
  return (
    <div className="mt-10 rounded-2xl border border-border bg-background px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm font-medium">{labels.q}</span>
        <div className="flex items-center gap-2">
          <button type="button" disabled={busy} onClick={() => send(true)} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-xs hover:bg-muted disabled:opacity-60"><ThumbsUp className="size-3.5" /> {labels.yes}</button>
          <button type="button" disabled={busy} onClick={() => setState("down")} className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs hover:bg-muted disabled:opacity-60 ${state === "down" ? "border-foreground" : "border-border"}`}><ThumbsDown className="size-3.5" /> {labels.no}</button>
        </div>
      </div>
      {state === "down" && (
        <div className="mt-3">
          <textarea value={comment} onChange={(e) => setComment(e.target.value.slice(0, 500))} rows={2} placeholder={labels.placeholder} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground" />
          <div className="mt-2 flex justify-end gap-2">
            <button type="button" disabled={busy} onClick={() => setState("idle")} className="rounded-full px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted">{labels.cancel}</button>
            <button type="button" disabled={busy} onClick={() => send(false, comment)} className="rounded-full bg-foreground px-4 py-1.5 text-xs font-medium text-background disabled:opacity-60">{labels.send}</button>
          </div>
        </div>
      )}
    </div>
  );
}
