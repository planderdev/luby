"use client";

import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { Sparkles, Loader2, Star, Lock } from "lucide-react";
import { matchInfluencers, type InfluencerMatch } from "./ai-match-actions";
import { createClient } from "@/lib/supabase/client";
import { InviteButton } from "@/app/dashboard/creators/InviteButton";

type Profile = { id: string; name: string; avatar_url: string | null };
type Relation = "applied" | "invited" | null;

export function AIMatches({
  campaignId,
  campaignTitle,
  campaignOpen,
  locked = false,
}: {
  campaignId: string;
  campaignTitle: string;
  /** 모집중일 때만 초대 버튼 노출 */
  campaignOpen: boolean;
  locked?: boolean;
}) {
  const [matches, setMatches] = useState<InfluencerMatch[] | null>(null);
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
  const [relations, setRelations] = useState<Map<string, Relation>>(new Map());
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run() {
    setError(null);
    startTransition(async () => {
      let r: Awaited<ReturnType<typeof matchInfluencers>>;
      try {
        r = await matchInfluencers(campaignId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "AI 매칭 중 오류가 발생했습니다.");
        return;
      }
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setMatches(r.matches);
      // Fetch profile info + 이 캠페인과의 관계(응모/초대 여부) for the returned IDs
      if (r.matches.length > 0) {
        const supabase = createClient();
        const ids = r.matches.map((m) => m.influencer_id);
        const [{ data }, { data: apps }, { data: invs }] = await Promise.all([
          supabase.from("profiles").select("id, name, avatar_url").in("id", ids),
          supabase
            .from("applications")
            .select("influencer_id")
            .eq("campaign_id", campaignId)
            .in("influencer_id", ids),
          supabase
            .from("campaign_invitations")
            .select("influencer_id")
            .eq("campaign_id", campaignId)
            .in("influencer_id", ids),
        ]);
        const m = new Map<string, Profile>();
        for (const p of data ?? []) m.set(p.id, p);
        setProfiles(m);
        const rel = new Map<string, Relation>();
        for (const i of invs ?? []) rel.set(i.influencer_id, "invited");
        for (const a of apps ?? []) rel.set(a.influencer_id, "applied"); // 응모가 우선
        setRelations(rel);
      }
    });
  }

  if (locked) {
    return (
      <section className="mt-10 rounded-3xl border border-accent/30 bg-accent-soft/40 p-6 lg:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-background">
              <Lock className="size-5 text-accent-ink" />
            </div>
            <div>
              <h3 className="text-lg font-semibold tracking-tight">AI 추천 인플루언서</h3>
              <p className="mt-0.5 text-sm text-muted-foreground">
                AI가 이 캠페인에 꼭 맞는 인플루언서를 골라주는 BUSINESS 전용 기능입니다.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/billing"
            className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background"
          >
            <Sparkles className="size-4" />
            BUSINESS 업그레이드
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-10 rounded-3xl border border-accent/30 bg-accent-soft/40 p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-background">
            <Sparkles className="size-5 text-accent-ink" />
          </div>
          <div>
            <h3 className="text-lg font-semibold tracking-tight">AI 추천 인플루언서</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">
              이 캠페인과 가장 잘 어울리는 인플루언서를 AI가 골라드립니다.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background disabled:opacity-50"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          {matches === null ? "AI 매칭 시작" : "다시 추천"}
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-2xl border border-accent/30 bg-background px-4 py-3 text-sm text-accent-ink">
          ⚠ {error}
        </div>
      )}

      {pending && matches === null && (
        <div className="mt-6 rounded-2xl glass-card px-6 py-12 text-center">
          <Loader2 className="mx-auto size-6 animate-spin text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            인플루언서 풀 분석 중... (보통 5~10초)
          </p>
        </div>
      )}

      {matches !== null && matches.length === 0 && !pending && (
        <div className="mt-6 rounded-2xl border border-dashed border-border bg-background px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            매칭 가능한 인플루언서가 아직 등록되어 있지 않습니다.
            <br />
            인플루언서 풀이 늘어나면 더 정확한 추천을 받을 수 있습니다.
          </p>
        </div>
      )}

      {matches !== null && matches.length > 0 && (
        <div className="mt-5 space-y-2">
          {matches.map((m, i) => {
            const p = profiles.get(m.influencer_id);
            const rel = relations.get(m.influencer_id) ?? null;
            return (
              <div
                key={m.influencer_id}
                className="flex flex-wrap items-start gap-4 rounded-2xl glass-card p-4"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-foreground text-background text-xs font-semibold">
                  {i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/dashboard/creators/${m.influencer_id}`}
                      className="text-sm font-semibold hover:underline underline-offset-2"
                      title="크리에이터 프로필 보기"
                    >
                      {p?.name ?? m.influencer_id.slice(0, 8)}
                    </Link>
                    <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent-ink">
                      <Star className="size-3 fill-current" />
                      {m.score}
                    </span>
                    {rel === "applied" && (
                      <span className="rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-medium text-success">
                        이미 응모함
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{m.reason}</p>
                </div>
                {campaignOpen && rel !== "applied" && (
                  <div className="w-full self-center sm:w-auto sm:shrink-0">
                    <InviteButton
                      influencerId={m.influencer_id}
                      campaigns={[{ id: campaignId, title: campaignTitle }]}
                      alreadyInvited={rel === "invited" ? [campaignId] : []}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {matches === null && !pending && (
        <p className="mt-4 text-xs text-muted-foreground">
          💡 추천 결과는 캠페인 정보(업종 · 채널 · 지역)와 인플루언서 프로필을 종합 분석합니다.
        </p>
      )}
    </section>
  );
}
