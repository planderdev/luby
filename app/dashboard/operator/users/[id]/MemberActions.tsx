"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Loader2 } from "lucide-react";
import { approveUser } from "../../actions";

export function MemberActions({ profileId, approved, role }: { profileId: string; approved: boolean; role: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  if (role === "operator") return null;
  function decide(next: boolean) {
    setError(null);
    startTransition(async () => {
      const r = await approveUser(profileId, next ? "approve" : "reject");
      if (!r.ok) setError(r.error);
      else router.refresh();
    });
  }
  return (
    <div className="flex flex-col items-end gap-2">
      {approved ? (
        <button type="button" onClick={() => decide(false)} disabled={pending} className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs hover:bg-muted disabled:opacity-50">
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-3.5" />} 승인 해제 (활동 중지)
        </button>
      ) : (
        <button type="button" onClick={() => decide(true)} disabled={pending} className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-xs font-medium text-background disabled:opacity-50">
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />} 승인
        </button>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
