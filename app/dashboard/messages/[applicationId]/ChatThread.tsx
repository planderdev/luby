"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Send } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { sendMessage, markThreadRead } from "../actions";

type Message = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

// Realtime 구독이 기본, 폴링은 연결 끊김 대비 느린 폴백
const POLL_MS = 30000;

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

function fmtDay(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export function ChatThread({
  applicationId,
  currentUserId,
  initialMessages,
  canSend,
  sendBlockedReason,
}: {
  applicationId: string;
  currentUserId: string;
  initialMessages: Message[];
  canSend: boolean;
  sendBlockedReason: string;
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const countRef = useRef(initialMessages.length);

  const refresh = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("messages")
      .select("id, sender_id, body, created_at")
      .eq("application_id", applicationId)
      .order("created_at", { ascending: true });
    if (!data) return;
    setMessages(data);
    if (data.length > countRef.current) {
      countRef.current = data.length;
      // 새로 도착한 상대방 메시지 읽음 처리
      void markThreadRead(applicationId);
    }
  }, [applicationId]);

  useEffect(() => {
    void markThreadRead(applicationId);
    const supabase = createClient();
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) supabase.realtime.setAuth(data.session.access_token);
    });
    const channel = supabase
      .channel(`messages:${applicationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `application_id=eq.${applicationId}` },
        (payload) => {
          const m = payload.new as Message;
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
          countRef.current += 1;
          if (m.sender_id !== currentUserId) void markThreadRead(applicationId);
        }
      )
      .subscribe();
    const t = setInterval(refresh, POLL_MS);
    return () => {
      clearInterval(t);
      void supabase.removeChannel(channel);
    };
  }, [applicationId, currentUserId, refresh]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  async function handleSend() {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setError(null);
    const result = await sendMessage(applicationId, text);
    if (result.ok) {
      setDraft("");
      setMessages((prev) => [
        ...prev,
        { id: result.id, sender_id: currentUserId, body: text, created_at: result.createdAt },
      ]);
      countRef.current += 1;
    } else {
      setError(result.error);
    }
    setSending(false);
  }

  let lastDay = "";

  return (
    <>
      <div className="mt-4 flex-1 space-y-3 overflow-y-auto rounded-2xl glass-card p-5">
        {messages.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">
            아직 메시지가 없어요. 첫 인사를 건네보세요!
          </p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === currentUserId;
          const day = fmtDay(m.created_at);
          const showDay = day !== lastDay;
          lastDay = day;
          return (
            <div key={m.id}>
              {showDay && (
                <div className="my-4 text-center text-[11px] text-muted-foreground">{day}</div>
              )}
              <div className={`flex items-end gap-2 ${mine ? "justify-end" : "justify-start"}`}>
                {mine && (
                  <span className="text-[10px] text-muted-foreground">{fmtTime(m.created_at)}</span>
                )}
                <div
                  className={`max-w-[75%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-sm ${
                    mine
                      ? "rounded-br-md bg-accent text-white"
                      : "rounded-bl-md bg-muted text-foreground"
                  }`}
                >
                  {m.body}
                </div>
                {!mine && (
                  <span className="text-[10px] text-muted-foreground">{fmtTime(m.created_at)}</span>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {canSend ? (
        <div className="mt-3">
          {error && <p className="mb-2 text-xs text-danger">{error}</p>}
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void handleSend();
            }}
          >
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
              rows={1}
              maxLength={2000}
              placeholder="메시지를 입력하세요 (Enter 전송, Shift+Enter 줄바꿈)"
              className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl border border-border bg-background px-4 py-2.5 text-sm outline-none"
            />
            <button
              type="submit"
              disabled={sending || !draft.trim()}
              aria-label="메시지 보내기"
              className="btn-neon inline-flex size-11 shrink-0 items-center justify-center rounded-full disabled:opacity-50"
            >
              {sending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
            </button>
          </form>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent/30 bg-accent-soft/50 px-5 py-3.5 text-sm text-accent-ink">
          <span>{sendBlockedReason}</span>
          <Link
            href="/dashboard/billing"
            className="btn-neon shrink-0 rounded-full px-4 py-2 text-xs font-bold"
          >
            플랜 보기
          </Link>
        </div>
      )}
    </>
  );
}
