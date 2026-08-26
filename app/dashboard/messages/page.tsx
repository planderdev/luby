import { redirect } from "next/navigation";
import Link from "next/link";
import { MessageSquare, Sparkles } from "lucide-react";
import { getCurrentProfile } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { getEntitlements } from "@/lib/plans/entitlements";

export const metadata = { title: "메시지 — 루비AI" };

function fmtTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
  }
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default async function MessagesPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login?redirect=/dashboard/messages");
  if (profile.role === "operator") redirect("/dashboard");

  const supabase = await createClient();

  // 스레드 = 선정/완료 상태의 응모 건
  let appsQuery = supabase
    .from("applications")
    .select(
      "id, status, influencer_id, created_at, campaigns!inner(id, title, business_name, advertiser_id)"
    )
    .in("status", ["selected", "completed"]);

  if (profile.role === "influencer") {
    appsQuery = appsQuery.eq("influencer_id", profile.id);
  } else {
    appsQuery = appsQuery.eq("campaigns.advertiser_id", profile.id);
  }

  const { data: apps } = await appsQuery;
  const threads = apps ?? [];
  const threadIds = threads.map((t) => t.id);

  // 각 스레드의 메시지 (최근 메시지 + 안읽음 수 계산)
  const { data: msgs } = threadIds.length
    ? await supabase
        .from("messages")
        .select("application_id, sender_id, body, created_at, read_at")
        .in("application_id", threadIds)
        .order("created_at", { ascending: false })
    : { data: [] };

  const lastByThread = new Map<string, { body: string; created_at: string }>();
  const unreadByThread = new Map<string, number>();
  for (const m of msgs ?? []) {
    if (!lastByThread.has(m.application_id)) {
      lastByThread.set(m.application_id, { body: m.body, created_at: m.created_at });
    }
    if (m.sender_id !== profile.id && !m.read_at) {
      unreadByThread.set(m.application_id, (unreadByThread.get(m.application_id) ?? 0) + 1);
    }
  }

  // 광고주 화면엔 크리에이터 이름 표시
  const namesById = new Map<string, string>();
  if (profile.role === "advertiser" && threads.length) {
    const { data: people } = await supabase
      .from("profiles")
      .select("id, name")
      .in(
        "id",
        threads.map((t) => t.influencer_id)
      );
    for (const p of people ?? []) namesById.set(p.id, p.name);
  }

  const ent = profile.role === "advertiser" ? await getEntitlements(profile.id) : null;

  const sorted = [...threads].sort((a, b) => {
    const la = lastByThread.get(a.id)?.created_at ?? a.created_at;
    const lb = lastByThread.get(b.id)?.created_at ?? b.created_at;
    return lb.localeCompare(la);
  });

  return (
    <div>
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">메시지</p>
      <h1 className="display mt-2 text-3xl font-semibold lg:text-4xl">대화</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        선정된 체험단과 일정·콘텐츠를 조율해보세요.
      </p>

      {ent?.tier === "free" && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent/30 bg-accent-soft/50 px-5 py-4 text-sm">
          <span className="inline-flex items-center gap-2 text-accent-ink">
            <Sparkles className="size-4 shrink-0" />
            전용 채팅은 BUSINESS 플랜 혜택이에요. 대화 내용은 볼 수 있지만, 메시지를 보내려면
            업그레이드가 필요해요.
          </span>
          <Link
            href="/dashboard/billing"
            className="btn-neon shrink-0 rounded-full px-4 py-2 text-xs font-bold"
          >
            플랜 보기
          </Link>
        </div>
      )}

      <div className="mt-8 flex flex-col gap-3">
        {sorted.map((t) => {
          const campaign = t.campaigns as unknown as {
            id: string;
            title: string;
            business_name: string;
          };
          const counterpart =
            profile.role === "advertiser"
              ? namesById.get(t.influencer_id) ?? "크리에이터"
              : campaign.business_name;
          const last = lastByThread.get(t.id);
          const unread = unreadByThread.get(t.id) ?? 0;
          return (
            <Link
              key={t.id}
              href={`/dashboard/messages/${t.id}`}
              className="flex items-center gap-4 rounded-2xl glass-card px-5 py-4 transition-colors hover:bg-muted/40"
            >
              <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-ink">
                <MessageSquare className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-sm font-semibold">{counterpart}</span>
                  {last && (
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {fmtTime(last.created_at)}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{campaign.title}</p>
                <p className="mt-1 truncate text-sm text-muted-foreground">
                  {last ? last.body : "아직 메시지가 없어요. 첫 인사를 건네보세요!"}
                </p>
              </div>
              {unread > 0 && (
                <span className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-accent-strong px-1.5 text-[11px] font-bold text-background">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </Link>
          );
        })}

        {sorted.length === 0 && (
          <div className="rounded-3xl border border-dashed border-border bg-background p-10 text-center text-sm text-muted-foreground">
            {profile.role === "advertiser"
              ? "크리에이터를 선정하면 여기서 대화를 시작할 수 있어요."
              : "체험단에 선정되면 광고주와의 대화가 여기에 열려요."}
          </div>
        )}
      </div>
    </div>
  );
}
