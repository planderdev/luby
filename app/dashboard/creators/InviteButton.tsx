"use client";

import { useState } from "react";
import { Check, Loader2, Send, X } from "lucide-react";
import { inviteCreator } from "./actions";

export type InviteCampaignOption = { id: string; title: string };

/**
 * 광고주 디렉터리 카드의 "초대" 버튼.
 * 클릭 → 카드 안에서 캠페인 선택 + 한 줄 메시지 → 발송.
 * (오버레이 없이 인라인 확장 — 투명 모달 이슈 회피)
 */
export function InviteButton({
  influencerId,
  campaigns,
  alreadyInvited,
}: {
  influencerId: string;
  campaigns: InviteCampaignOption[];
  /** 이 크리에이터를 이미 초대한 캠페인 id 목록 */
  alreadyInvited: string[];
}) {
  const [open, setOpen] = useState(false);
  const [campaignId, setCampaignId] = useState(
    campaigns.find((c) => !alreadyInvited.includes(c.id))?.id ?? campaigns[0]?.id ?? ""
  );
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState<string[]>(alreadyInvited);
  const [error, setError] = useState<string | null>(null);

  if (campaigns.length === 0) return null;
  const allInvited = campaigns.every((c) => done.includes(c.id));

  async function send() {
    if (!campaignId || pending) return;
    setPending(true);
    setError(null);
    const r = await inviteCreator(campaignId, influencerId, message);
    if (r.ok) {
      setDone((d) => [...d, campaignId]);
      setOpen(false);
      setMessage("");
    } else {
      setError(r.error);
    }
    setPending(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={allInvited}
        className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium ${
          allInvited
            ? "bg-success-soft text-success"
            : "btn-neon font-bold"
        }`}
      >
        {allInvited ? (
          <>
            <Check className="size-3.5" /> 초대 완료
          </>
        ) : (
          <>
            <Send className="size-3.5" /> 초대
          </>
        )}
      </button>
    );
  }

  return (
    <div className="mt-3 w-full rounded-xl border border-border bg-background p-3" onClick={(e) => e.preventDefault()}>
      <label className="text-[11px] font-medium text-muted-foreground">초대할 캠페인</label>
      <select
        value={campaignId}
        onChange={(e) => setCampaignId(e.target.value)}
        className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none"
      >
        {campaigns.map((c) => (
          <option key={c.id} value={c.id} disabled={done.includes(c.id)}>
            {c.title}
            {done.includes(c.id) ? " (초대됨)" : ""}
          </option>
        ))}
      </select>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={2}
        maxLength={500}
        placeholder="한 줄 메시지 (선택) — 왜 이 크리에이터를 원하는지 적으면 수락률이 올라가요"
        className="mt-2 w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none"
      />
      {error && <p className="mt-1 text-[11px] text-danger">{error}</p>}
      <div className="mt-2 flex justify-end gap-1.5">
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={pending}
          className="inline-flex size-8 items-center justify-center rounded-full border border-border hover:bg-muted"
          aria-label="취소"
        >
          <X className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={send}
          disabled={pending || !campaignId || done.includes(campaignId)}
          className="btn-neon inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold disabled:opacity-50"
        >
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
          보내기
        </button>
      </div>
    </div>
  );
}
