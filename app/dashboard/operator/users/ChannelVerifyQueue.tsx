import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { ChannelVerifyItem } from "./ChannelVerifyItem";

/**
 * 채널 본인 인증 요청 대기열 — 크리에이터가 올린 캡처(비공개 버킷, 1시간 서명 URL)에서 인증 코드와 팔로워 수를 확인해 승인·반려.
 * 데모 계정 요청은 뺀다. 요청이 없으면 아무것도 그리지 않는다.
 */
export async function ChannelVerifyQueue() {
  const admin = getAdminSupabase();
  const { data } = await admin
    .from("influencer_channels")
    .select("id, url, handle, followers, verify_code, verify_requested_at, proof_path, influencer_id, channel_types(name), profiles:influencer_id(name, email, is_demo)")
    .eq("verify_status", "pending")
    .order("verify_requested_at", { ascending: true })
    .limit(30);
  type Row = {
    id: string; url: string; handle: string | null; followers: number; verify_code: string | null; verify_requested_at: string | null;
    proof_path: string | null; influencer_id: string; channel_types: { name: string } | null; profiles: { name: string | null; email: string; is_demo: boolean } | null;
  };
  const rows = ((data ?? []) as unknown as Row[]).filter((r) => !r.profiles?.is_demo);
  if (rows.length === 0) return null;

  const signed = await Promise.all(
    rows.map(async (r) => (r.proof_path ? (await admin.storage.from("channel-proofs").createSignedUrl(r.proof_path, 3600)).data?.signedUrl ?? null : null)),
  );

  return (
    <section id="channel-verify" className="mt-6 scroll-mt-24 rounded-3xl glass-card p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <ShieldCheck className="size-4" /> 채널 인증 요청 {rows.length}건
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        캡처에 <b>인증 코드</b>가 채널 소개란에 보이고, 화면의 <b>팔로워 수</b>가 신고한 숫자와 맞는지 확인하세요. 팔로워 수는 캡처에서 확인한 값으로 고쳐 승인할 수 있어요.
      </p>
      <ul className="mt-4 space-y-3">
        {rows.map((r, i) => (
          <li key={r.id} className="flex flex-wrap gap-4 rounded-2xl border border-border bg-background p-4">
            {signed[i] ? (
              <a href={signed[i]!} target="_blank" rel="noopener noreferrer" className="shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={signed[i]!} alt="인증 캡처" className="h-40 w-24 rounded-xl border border-border object-cover object-top" />
              </a>
            ) : (
              <div className="flex h-40 w-24 shrink-0 items-center justify-center rounded-xl border border-dashed border-border text-[11px] text-muted-foreground">캡처 없음</div>
            )}
            <div className="min-w-0 flex-1 text-sm">
              <div className="font-medium">
                <Link href={`/dashboard/operator/users/${r.influencer_id}`} className="hover:underline underline-offset-2">
                  {r.profiles?.name ?? "크리에이터"}
                </Link>{" "}
                <span className="text-xs text-muted-foreground">{r.profiles?.email}</span>
              </div>
              <div className="mt-1 text-xs">
                {r.channel_types?.name ?? "채널"} ·{" "}
                <a href={r.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                  {r.handle || r.url}
                </a>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                인증 코드 <code className="rounded bg-muted px-1.5 py-0.5 font-mono font-semibold text-foreground">{r.verify_code}</code> · 신고 팔로워{" "}
                {r.followers.toLocaleString("ko-KR")} · 요청 {r.verify_requested_at ? new Date(r.verify_requested_at).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "-"}
              </div>
              <ChannelVerifyItem channelId={r.id} claimed={r.followers} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
