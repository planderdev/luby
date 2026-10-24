"use client";

import { useRef, useState, useTransition } from "react";
import { Check, Copy, Loader2, ShieldCheck, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { prepareImage, RESIZE_PRESET } from "@/lib/image-resize";
import { checkYouTubeVerification, requestChannelVerification, startChannelVerification } from "./actions";
import { dashboardDict } from "@/lib/i18n/app/dashboard";
import type { Locale } from "@/lib/i18n/config";
import { translateRejectReason } from "@/lib/channels/reject-reasons";

/**
 * 채널 본인 인증 — 코드 받기 → 채널 소개란에 넣기 → (유튜브) 자동 확인 / (그 밖) 코드·팔로워가 보이는 캡처 올려 운영자 확인.
 * 캡처는 비공개 버킷 channel-proofs/{내 id}/ 에 올라가고 본인·운영자만 본다.
 */
export function ChannelVerify({
  channelId,
  status,
  note,
  followers,
  locale = "ko",
  initialOpen,
}: {
  channelId: string;
  status: string;
  note: string | null;
  followers: number;
  locale?: Locale;
  /** 미리보기·렌더 시험용 — 코드를 받은 상태로 연다 */
  initialOpen?: { code: string; auto: boolean };
}) {
  const v = dashboardDict[locale].settings.channels.verify;
  const [open, setOpen] = useState(!!initialOpen);
  const [code, setCode] = useState<string | null>(initialOpen?.code ?? null);
  const [auto, setAuto] = useState(initialOpen?.auto ?? false);
  const [copied, setCopied] = useState(false);
  const [proofPath, setProofPath] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [count, setCount] = useState(followers || 0);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  if (status === "verified") return null;
  if (status === "pending" && !open) return <p className="mt-1 text-[11px] text-muted-foreground">{v.pendingDesc}</p>;

  function begin() {
    setMsg(null);
    startTransition(async () => {
      const r = await startChannelVerification(channelId, locale);
      if (!r.ok) return setMsg({ ok: false, text: r.error });
      setCode(r.code);
      setAuto(r.auto);
      setOpen(true);
    });
  }

  async function upload(file: File | undefined) {
    if (!file) return;
    setMsg(null);
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 15 * 1024 * 1024) return setMsg({ ok: false, text: v.errUpload });
    setUploading(true);
    try {
      const prepared = await prepareImage(file, RESIZE_PRESET["channel-proofs"]);
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("no user");
      const path = `${user.id}/${channelId}-${Date.now()}.${prepared.ext}`;
      const { error } = await supabase.storage.from("channel-proofs").upload(path, prepared.blob, { contentType: prepared.contentType, upsert: false });
      if (error) throw error;
      setProofPath(path);
    } catch {
      setMsg({ ok: false, text: v.errUpload });
    } finally {
      setUploading(false);
    }
  }

  function check() {
    setMsg(null);
    startTransition(async () => {
      const r = await checkYouTubeVerification(channelId, locale);
      setMsg(r.ok ? { ok: true, text: v.verifiedYT } : { ok: false, text: r.error });
    });
  }

  function submit() {
    if (!proofPath) return setMsg({ ok: false, text: v.errProof });
    setMsg(null);
    startTransition(async () => {
      const r = await requestChannelVerification(channelId, { proofPath, followers: count }, locale);
      if (r.ok) {
        setMsg({ ok: true, text: v.requested });
        setOpen(false);
      } else setMsg({ ok: false, text: r.error });
    });
  }

  if (!open) {
    return (
      <div className="mt-1.5">
        {status === "rejected" && note && <p className="text-[11px] text-accent-ink">{v.rejectedDesc(locale === "ko" ? note : translateRejectReason(note, locale))}</p>}
        <button
          type="button"
          onClick={begin}
          disabled={pending}
          className="mt-1 inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1 text-[11px] font-medium hover:bg-muted disabled:opacity-50"
        >
          {pending ? <Loader2 className="size-3 animate-spin" /> : <ShieldCheck className="size-3" />}
          {status === "rejected" ? v.retry : v.start}
        </button>
        {msg && <p className={`mt-1 text-[11px] ${msg.ok ? "text-success" : "text-accent-ink"}`}>{msg.text}</p>}
      </div>
    );
  }

  return (
    <div className="mt-3 w-full rounded-2xl border border-border bg-background p-4 text-xs">
      <div className="flex items-center gap-1.5 font-semibold">
        <ShieldCheck className="size-3.5" /> {v.title}
      </div>
      <p className="mt-1 text-muted-foreground">{v.why}</p>

      <p className="mt-3">1. {v.step1}</p>
      <div className="mt-1.5 flex items-center gap-2">
        <code className="rounded-xl bg-muted px-3 py-1.5 font-mono text-sm font-semibold tracking-wider">{code}</code>
        <button
          type="button"
          onClick={() => {
            if (!code) return;
            void navigator.clipboard?.writeText(code).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            });
          }}
          className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 hover:bg-muted"
        >
          {copied ? <Check className="size-3" /> : <Copy className="size-3" />} {copied ? v.copied : v.copy}
        </button>
      </div>

      {auto ? (
        <>
          <p className="mt-3">2. {v.stepYouTube}</p>
          <button type="button" onClick={check} disabled={pending} className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-1.5 font-medium text-background disabled:opacity-50">
            {pending && <Loader2 className="size-3 animate-spin" />} {v.check}
          </button>
        </>
      ) : (
        <>
          <p className="mt-3">2. {v.stepProof}</p>
          <div className="mt-2 flex flex-wrap items-end gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 font-medium disabled:opacity-50 ${proofPath ? "border-success/40 text-success" : "border-border hover:bg-muted"}`}
            >
              {uploading ? <Loader2 className="size-3 animate-spin" /> : proofPath ? <Check className="size-3" /> : <Upload className="size-3" />}
              {uploading ? v.uploading : proofPath ? v.uploaded : v.upload}
            </button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" aria-label={v.upload} onChange={(e) => void upload(e.target.files?.[0])} />
            <label className="flex flex-col gap-1">
              <span className="text-muted-foreground">{v.followersNow}</span>
              <input
                type="number"
                min={0}
                value={count || ""}
                onChange={(e) => setCount(Number(e.target.value || 0))}
                className="w-32 rounded-full border border-border bg-background px-3 py-1.5 outline-none focus:border-foreground/40"
              />
            </label>
            <button type="button" onClick={submit} disabled={pending || uploading || !proofPath} className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-1.5 font-medium text-background disabled:opacity-50">
              {pending && <Loader2 className="size-3 animate-spin" />} {v.submit}
            </button>
          </div>
        </>
      )}
      <div className="mt-3 flex items-center justify-between gap-2">
        {msg ? <p className={msg.ok ? "text-success" : "text-accent-ink"}>{msg.text}</p> : <span />}
        <button type="button" onClick={() => setOpen(false)} className="rounded-full px-2.5 py-1 text-muted-foreground hover:bg-muted">
          {v.close}
        </button>
      </div>
    </div>
  );
}
