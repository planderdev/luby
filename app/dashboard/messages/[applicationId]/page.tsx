import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { getEntitlements } from "@/lib/plans/entitlements";
import { ChatThread } from "./ChatThread";

export const metadata = { title: "메시지 — 루비AI" };

export default async function MessageThreadPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login?redirect=/dashboard/messages");
  if (profile.role === "operator") redirect("/dashboard");

  const { applicationId } = await params;
  const supabase = await createClient();

  // RLS로 본인 관련 응모 건만 보임 — 없으면 목록으로
  const { data: app } = await supabase
    .from("applications")
    .select(
      "id, status, influencer_id, campaigns!inner(id, title, business_name, advertiser_id)"
    )
    .eq("id", applicationId)
    .in("status", ["selected", "completed"])
    .maybeSingle();
  if (!app) redirect("/dashboard/messages");

  const campaign = app.campaigns as unknown as {
    id: string;
    title: string;
    business_name: string;
    advertiser_id: string;
  };

  // 상대방 표시 이름
  let counterpart = campaign.business_name;
  if (profile.role === "advertiser") {
    const { data: influencer } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", app.influencer_id)
      .maybeSingle();
    counterpart = influencer?.name ?? "크리에이터";
  }

  // 발신 가능 여부 (광고주는 유료 플랜만)
  let canSend = true;
  let sendBlockedReason = "";
  if (profile.role === "advertiser") {
    const ent = await getEntitlements(profile.id);
    if (ent.tier === "free") {
      canSend = false;
      sendBlockedReason = "전용 채팅은 BUSINESS 플랜부터 보낼 수 있어요.";
    }
  }

  const { data: messages } = await supabase
    .from("messages")
    .select("id, sender_id, body, created_at")
    .eq("application_id", applicationId)
    .order("created_at", { ascending: true });

  return (
    <div className="flex h-[calc(100dvh-11rem)] flex-col lg:h-[calc(100dvh-8rem)]">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/messages"
          aria-label="메시지 목록으로"
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-background transition-colors hover:bg-muted"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div className="min-w-0">
          {profile.role === "advertiser" ? (
            <Link
              href={`/dashboard/creators/${app.influencer_id}`}
              className="block truncate text-lg font-semibold tracking-tight hover:underline underline-offset-2"
              title="크리에이터 프로필 보기"
            >
              {counterpart}
            </Link>
          ) : (
            <h1 className="truncate text-lg font-semibold tracking-tight">{counterpart}</h1>
          )}
          <Link
            href={`/dashboard/campaigns/${campaign.id}`}
            className="block truncate text-xs text-muted-foreground hover:text-foreground"
          >
            {campaign.title}
          </Link>
        </div>
      </div>

      <ChatThread
        applicationId={applicationId}
        currentUserId={profile.id}
        initialMessages={messages ?? []}
        canSend={canSend}
        sendBlockedReason={sendBlockedReason}
      />
    </div>
  );
}
