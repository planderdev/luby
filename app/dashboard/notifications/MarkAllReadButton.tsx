"use client";

import { useTransition } from "react";
import { CheckCheck, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { markAllNotificationsRead } from "./actions";

export function MarkAllReadButton() {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() =>
        startTransition(async () => {
          await markAllNotificationsRead();
          router.refresh();
        })
      }
      disabled={pending}
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-2 text-xs font-medium hover:bg-muted disabled:opacity-50"
    >
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCheck className="size-3.5" />}
      모두 읽음
    </button>
  );
}
