"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Building2, Sparkles } from "lucide-react";
import { completeOnboarding } from "./actions";
import { ADVERTISER_KINDS, type AdvertiserKind } from "@/lib/advertiser-kind";

type Role = "advertiser" | "influencer";

export function OnboardingForm({
  initialRole,
  defaultName,
  regions,
  next,
  refId,
}: {
  initialRole: Role | null;
  defaultName: string;
  regions: { id: string; name: string; flag: string }[];
  next: string;
  refId: string | null;
}) {
  const router = useRouter();
  const [role, setRole] = useState<Role | null>(initialRole);
  const [name, setName] = useState(defaultName);
  const [companyName, setCompanyName] = useState("");
  const [businessNumber, setBusinessNumber] = useState("");
  const [kind, setKind] = useState<AdvertiserKind>("brand");
  const [regionId, setRegionId] = useState(regions[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!role) return;
    setError(null);
    startTransition(async () => {
      const r = await completeOnboarding({
        role,
        name,
        companyName,
        businessNumber,
        advertiserKind: kind,
        regionId: role === "influencer" ? regionId || null : null,
        refId,
      });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      router.push(next);
      router.refresh();
    });
  }

  const input = "w-full rounded-2xl glass-card px-4 py-3 text-sm outline-none focus:border-foreground";

  return (
    <div className="space-y-6">
      {!role ? (
        <div className="grid gap-3">
          <button type="button" onClick={() => setRole("advertiser")} className="flex items-start gap-3 rounded-2xl border border-border p-4 text-left hover:bg-muted">
            <Building2 className="mt-0.5 size-5 text-accent-ink" />
            <div><div className="text-sm font-semibold">광고주 · 대행사</div><div className="text-xs text-muted-foreground">캠페인을 열고 크리에이터를 모집해요 (첫 캠페인 무료)</div></div>
          </button>
          <button type="button" onClick={() => setRole("influencer")} className="flex items-start gap-3 rounded-2xl border border-border p-4 text-left hover:bg-muted">
            <Sparkles className="mt-0.5 size-5 text-accent-ink" />
            <div><div className="text-sm font-semibold">크리에이터</div><div className="text-xs text-muted-foreground">캠페인에 응모하고 체험 후 포인트를 받아요</div></div>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <button type="button" onClick={() => setRole(null)} className="text-xs text-muted-foreground hover:text-foreground">← 역할 변경</button>
          <div>
            <label className="text-xs font-medium text-muted-foreground">{role === "advertiser" ? "담당자 이름" : "이름·닉네임"}</label>
            <input className={`${input} mt-1.5`} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          {role === "advertiser" ? (
            <>
              <div>
                <label className="text-xs font-medium text-muted-foreground">광고주 유형</label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {ADVERTISER_KINDS.map((k) => {
                    const on = kind === k.value;
                    return (
                      <button key={k.value} type="button" onClick={() => setKind(k.value)} aria-pressed={on} className={`rounded-2xl border px-4 py-3 text-left ${on ? "border-foreground bg-foreground text-background" : "border-border bg-background hover:bg-muted"}`}>
                        <div className="text-sm font-semibold">{k.label}</div>
                        <div className={`mt-0.5 text-xs ${on ? "text-background/70" : "text-muted-foreground"}`}>{k.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">{kind === "agency" ? "대행사명" : "회사·상호명"}</label>
                <input className={`${input} mt-1.5`} value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">사업자등록번호</label>
                <input className={`${input} mt-1.5`} value={businessNumber} onChange={(e) => setBusinessNumber(e.target.value)} placeholder="123-45-67890" required />
              </div>
            </>
          ) : (
            <div>
              <label className="text-xs font-medium text-muted-foreground">활동 지역</label>
              <select className={`${input} mt-1.5`} value={regionId} onChange={(e) => setRegionId(e.target.value)}>
                {regions.map((r) => (
                  <option key={r.id} value={r.id}>{r.flag} {r.name}</option>
                ))}
              </select>
              <p className="mt-2 text-xs text-muted-foreground">채널·전문 분야는 가입 후 설정에서 등록할 수 있어요.</p>
            </div>
          )}
          {error && <div className="rounded-2xl border border-accent/30 bg-accent-soft px-4 py-3 text-sm text-accent-ink">{error}</div>}
          <button type="button" onClick={submit} disabled={pending} className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background disabled:opacity-60">
            {pending && <Loader2 className="size-4 animate-spin" />} 시작하기
          </button>
        </div>
      )}
    </div>
  );
}
