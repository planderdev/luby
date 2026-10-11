"use client";

import { useState, useTransition } from "react";
import { Loader2, MailX, Pencil } from "lucide-react";
import { changeMemberEmail } from "../../actions";

/**
 * 회원 상세 — 로그인 이메일 수정(운영자). 반송된 주소면 눈에 띄게 펼쳐 두고, 아니면 작은 '이메일 수정' 링크로 접어 둔다.
 * 바꾼 주소는 인증 완료 상태가 되고, 미로그인 회원이면 그다음 '초대 메일 재발송'으로 비밀번호 설정 링크를 보내면 된다.
 */
export function MemberEmailEditor({ profileId, email, bounced }: { profileId: string; email: string; bounced: boolean }) {
  const [open, setOpen] = useState(bounced);
  const [value, setValue] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setMsg(null);
    startTransition(async () => {
      const r = await changeMemberEmail(profileId, value);
      if (r.ok) {
        setMsg({ ok: true, text: `${r.email} 으로 바꿨어요. 한 번도 로그인하지 않은 회원이면 '초대 메일 재발송'으로 비밀번호 설정 링크를 보내 주세요.` });
        setValue("");
      } else setMsg({ ok: false, text: r.error });
    });
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
        <Pencil className="size-3" /> 이메일 수정
      </button>
    );
  }

  return (
    <div className={`mt-4 w-full rounded-2xl p-4 ${bounced ? "border border-accent/30 bg-accent-soft/40" : "border border-border bg-muted/30"}`}>
      {bounced ? (
        <p className="flex items-start gap-2 text-xs leading-relaxed">
          <MailX className="mt-0.5 size-4 shrink-0 text-accent-ink" />
          <span>
            <b className="font-semibold">{email}</b> 은 없는 주소로 반송돼 Resend 가 모든 메일을 막고 있어요. 초대·알림이 닿지 않으니 실제 이메일로 바꿔 주세요.
          </span>
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">로그인 이메일을 바꿉니다. 회원 본인에게 따로 확인 메일은 가지 않아요.</p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          type="email"
          inputMode="email"
          autoComplete="off"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && value.trim() && !pending) save(); }}
          placeholder="새 로그인 이메일"
          aria-label="새 로그인 이메일"
          className="min-w-0 flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm outline-none focus:border-foreground/40 sm:max-w-xs"
        />
        <button
          type="button"
          onClick={save}
          disabled={pending || !value.trim()}
          className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-xs font-medium text-background disabled:opacity-50"
        >
          {pending && <Loader2 className="size-3.5 animate-spin" />} 바꾸기
        </button>
        {!bounced && (
          <button type="button" onClick={() => { setOpen(false); setMsg(null); }} className="rounded-full px-3 py-2 text-xs text-muted-foreground hover:bg-muted">
            닫기
          </button>
        )}
      </div>
      {msg && <p className={`mt-2 text-xs ${msg.ok ? "text-success" : "text-accent-ink"}`}>{msg.text}</p>}
    </div>
  );
}
