"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, Loader2, ExternalLink } from "lucide-react";
import { addChannel, deleteChannel } from "./actions";
import { channelHint } from "@/lib/channel-hints";

export type ChannelRow = {
  id: string;
  channel_type_id: string;
  url: string;
  handle: string | null;
  followers: number;
  verified: boolean;
};

type ChannelType = { id: string; slug: string; name: string };

export function ChannelManager({
  channels,
  channelTypes,
}: {
  channels: ChannelRow[];
  channelTypes: ChannelType[];
}) {
  const [showForm, setShowForm] = useState(false);
  const [typeId, setTypeId] = useState(channelTypes[0]?.id ?? "");
  const [url, setUrl] = useState("");
  const [handle, setHandle] = useState("");
  const [followers, setFollowers] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const typeNameById = new Map(channelTypes.map((t) => [t.id, t.name]));
  const selectedSlug = channelTypes.find((t) => t.id === typeId)?.slug;
  const hint = channelHint(selectedSlug);

  function submit() {
    setError(null);
    startTransition(async () => {
      const r = await addChannel({
        channel_type_id: typeId,
        url,
        handle: handle || null,
        followers,
      });
      if (r.ok) {
        setShowForm(false);
        setUrl("");
        setHandle("");
        setFollowers(0);
      } else {
        setError(r.error);
      }
    });
  }

  function remove(id: string) {
    setError(null);
    startTransition(async () => {
      const r = await deleteChannel(id);
      if (!r.ok) setError(r.error);
    });
  }

  return (
    <div id="channels" className="scroll-mt-24 rounded-3xl glass-card p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            SNS 채널
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            등록된 채널이 많고 정확할수록 캠페인 매칭 확률이 올라가요.
          </p>
        </div>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-2 text-xs font-medium hover:bg-muted"
          >
            <Plus className="size-3.5" />
            채널 추가
          </button>
        )}
      </div>

      {/* Existing channels */}
      <div className="mt-5 space-y-2">
        {channels.length === 0 && !showForm && (
          <div className="rounded-2xl border border-dashed border-border px-5 py-8 text-center text-sm text-muted-foreground">
            아직 등록된 채널이 없어요. 첫 채널을 추가해보세요.
          </div>
        )}
        {channels.map((ch) => (
          <div
            key={ch.id}
            className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-muted/30 px-4 py-3"
          >
            <span className="rounded-full bg-background px-3 py-1 text-xs font-medium">
              {typeNameById.get(ch.channel_type_id) ?? "채널"}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-sm font-medium">
                <span className="truncate">{ch.handle || ch.url}</span>
                <a
                  href={ch.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                  aria-label="채널 열기"
                >
                  <ExternalLink className="size-3.5" />
                </a>
              </div>
              <div className="text-xs text-muted-foreground">
                팔로워 {ch.followers.toLocaleString()}명
                {ch.verified && <span className="ml-2 text-accent-ink">✓ 인증됨</span>}
              </div>
            </div>
            <button
              type="button"
              onClick={() => remove(ch.id)}
              disabled={pending}
              className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
              aria-label="채널 삭제"
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            </button>
          </div>
        ))}
      </div>

      {/* Add form */}
      {showForm && (
        <div className="mt-4 rounded-2xl border border-border bg-muted/30 p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                채널 종류
              </label>
              <select
                value={typeId}
                onChange={(e) => setTypeId(e.target.value)}
                className="w-full rounded-2xl glass-card px-4 py-3 text-sm outline-none focus:border-foreground"
              >
                {channelTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                핸들 <span className="text-muted-foreground/70">— 선택</span>
              </label>
              <input
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder={hint.handlePlaceholder}
                className="w-full rounded-2xl glass-card px-4 py-3 text-sm outline-none focus:border-foreground"
              />
            </div>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-[2fr_1fr]">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                채널 URL
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={hint.urlPlaceholder}
                className="w-full rounded-2xl glass-card px-4 py-3 text-sm outline-none focus:border-foreground"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                팔로워 수
              </label>
              <input
                type="number"
                min={0}
                value={followers || ""}
                onChange={(e) => setFollowers(Number(e.target.value || 0))}
                placeholder="0"
                className="w-full rounded-2xl glass-card px-4 py-3 text-sm outline-none focus:border-foreground"
              />
            </div>
          </div>
          {hint.tip && (
            <p className="mt-2 text-xs text-muted-foreground">💡 {hint.tip}</p>
          )}
          {error && (
            <div className="mt-3 rounded-xl border border-accent/30 bg-accent-soft px-3 py-2 text-xs text-accent-ink">
              {error}
            </div>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setError(null);
              }}
              disabled={pending}
              className="rounded-full border border-border bg-background px-4 py-2 text-xs font-medium hover:bg-muted"
            >
              취소
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={pending || !url.trim()}
              className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-5 py-2 text-xs font-medium text-background disabled:opacity-50"
            >
              {pending && <Loader2 className="size-3.5 animate-spin" />}
              추가하기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
