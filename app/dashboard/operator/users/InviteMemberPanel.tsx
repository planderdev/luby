"use client";

import { useState, useTransition } from "react";
import { UserPlus, Loader2, Check, Copy } from "lucide-react";
import { inviteMember } from "../actions";
import { ADVERTISER_KINDS, type AdvertiserKind } from "@/lib/advertiser-kind";

type Role = "advertiser" | "influencer";

/** 운영자 회원 추가(초대) — 광고주·대행사·크리에이터 */
export function InviteMemberPanel({ regions }: { regions: { id: string; name: string; flag: string }[] }) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<Role>("advertiser");
  const [kind, setKind] = useState<AdvertiserKind>("brand");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [businessNumber, setBusinessNumber] = useState("");
  const [regionId, setRegionId] = useState(regions[0]?.id ?? "");
  const [mode, setMode] = useState<"invite" | "temp" | "manual">("invite");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [result, setResult] = useState<{ invited: boolean; tempPassword?: string; email: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();
  const input = "w-full rounded-2xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-foreground";

  function submit() {
    setError(null);
    setResult(null);
    startTransition(async () => {
      const r = await inviteMember({ email, name, role, advertiserKind: kind, companyName, businessNumber, regionId: role === "influencer" ? regionId : null, phone, mode, password: mode === "manual" ? password : undefined });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setResult({ invited: r.invited, tempPassword: r.tempPassword ?? (mode === "manual" ? password : undefined), email: email.trim().toLowerCase() });
      setEmail(""); setName(""); setPhone(""); setCompanyName(""); setBusinessNumber(""); setPassword("");
    });
  }

  return (
    <div className="mt-6">
      <button type="button" onClick={() => setOpen((v) => !v)} className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background">
        <UserPlus className="size-4" /> 회원 추가
      </button>
      {open && (
        <div className="mt-3 rounded-3xl glass-card p-5 lg:p-6">
          <div className="grid gap-2 sm:grid-cols-3">
            {([
              { r: "advertiser" as Role, k: "brand" as AdvertiserKind, label: "광고주 (브랜드·자영업)" },
              { r: "advertiser" as Role, k: "agency" as AdvertiserKind, label: "대행사 · 실행사" },
              { r: "influencer" as Role, k: "brand" as AdvertiserKind, label: "크리에이터 (인플루언서)" },
            ]).map((o) => {
              const on = role === o.r && (o.r === "influencer" || kind === o.k);
              return (
                <button key={o.label} type="button" onClick={() => { setRole(o.r); setKind(o.k); }} aria-pressed={on} className={`rounded-2xl border px-4 py-3 text-left text-sm font-medium ${on ? "border-foreground bg-foreground text-background" : "border-border bg-background hover:bg-muted"}`}>
                  {o.label}
                </button>
              );
            })}
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div><label className="text-xs font-medium text-muted-foreground">이메일</label><input className={`${input} mt-1`} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" /></div>
            <div><label className="text-xs font-medium text-muted-foreground">{role === "advertiser" ? "담당자 이름" : "이름·닉네임"}</label><input className={`${input} mt-1`} value={name} onChange={(e) => setName(e.target.value)} /></div>
            {role === "advertiser" ? (
              <>
                <div><label className="text-xs font-medium text-muted-foreground">{kind === "agency" ? "대행사명" : "회사·상호명"}</label><input className={`${input} mt-1`} value={companyName} onChange={(e) => setCompanyName(e.target.value)} /></div>
                <div><label className="text-xs font-medium text-muted-foreground">사업자등록번호 (선택)</label><input className={`${input} mt-1`} value={businessNumber} onChange={(e) => setBusinessNumber(e.target.value)} placeholder="123-45-67890" /></div>
              </>
            ) : (
              <div><label className="text-xs font-medium text-muted-foreground">활동 지역</label>
                <select className={`${input} mt-1`} value={regionId} onChange={(e) => setRegionId(e.target.value)}>{regions.map((r) => <option key={r.id} value={r.id}>{r.flag} {r.name}</option>)}</select>
              </div>
            )}
            <div><label className="text-xs font-medium text-muted-foreground">연락처 (선택)</label><input className={`${input} mt-1`} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="010-0000-0000" /></div>
          </div>
          <div className="mt-4">
            <div className="text-xs font-medium text-muted-foreground">계정 전달 방식</div>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {([
                { v: "invite", t: "초대 메일", d: "비밀번호 설정 링크를 메일로 보냄" },
                { v: "temp", t: "임시 비밀번호 생성", d: "랜덤 비밀번호를 만들어 화면에 표시" },
                { v: "manual", t: "비밀번호 직접 지정", d: "운영자가 정한 비밀번호로 바로 생성" },
              ] as const).map((o) => (
                <button key={o.v} type="button" onClick={() => setMode(o.v)} aria-pressed={mode === o.v} className={`rounded-2xl border px-4 py-3 text-left ${mode === o.v ? "border-foreground bg-foreground text-background" : "border-border bg-background hover:bg-muted"}`}>
                  <div className="text-sm font-semibold">{o.t}</div>
                  <div className={`mt-0.5 text-xs ${mode === o.v ? "text-background/70" : "text-muted-foreground"}`}>{o.d}</div>
                </button>
              ))}
            </div>
            {mode === "manual" && (
              <div className="mt-3 max-w-sm">
                <label className="text-xs font-medium text-muted-foreground">비밀번호 (8자 이상, 영문+숫자)</label>
                <div className="mt-1 flex gap-2">
                  <input className={input} type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" placeholder="예: Luby2026!team" />
                  <button type="button" onClick={() => setShowPw((v) => !v)} className="shrink-0 rounded-2xl border border-border px-3 text-xs hover:bg-muted">{showPw ? "숨김" : "표시"}</button>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">회원에게 안전한 경로로 전달하고 첫 로그인 후 변경하도록 안내하세요.</p>
              </div>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">크리에이터는 운영자가 추가하므로 바로 승인 상태로 생성됩니다. 광고주는 가입 즉시 활동 가능합니다.</p>
          {ADVERTISER_KINDS.length > 0 && role === "advertiser" && kind === "agency" && <p className="mt-1 text-xs text-muted-foreground">대행사는 캠페인마다 클라이언트 상호를 따로 입력할 수 있어요.</p>}
          <div className="mt-4 flex items-center gap-2">
            <button type="button" onClick={submit} disabled={pending || (mode === "manual" && password.length < 8)} className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background disabled:opacity-60">
              {pending ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />} {mode === "invite" ? "초대 보내기" : "계정 생성"}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="rounded-full px-3 py-2 text-sm text-muted-foreground hover:text-foreground">닫기</button>
          </div>
          {error && <p className="mt-3 text-sm text-danger">{error}</p>}
          {result && (
            <div className="mt-3 rounded-2xl bg-success-soft px-4 py-3 text-sm text-success">
              <div className="flex items-center gap-2"><Check className="size-4" /> {result.email} 추가 완료{result.invited ? " — 초대 메일을 보냈어요 (링크에서 비밀번호 설정)" : " — 아래 비밀번호를 회원에게 전달하세요"}</div>
              {result.tempPassword && (
                <div className="mt-2 flex items-center gap-2 text-foreground">
                  <code className="rounded-lg bg-background px-2 py-1 text-xs">{result.tempPassword}</code>
                  <button type="button" onClick={async () => { await navigator.clipboard.writeText(result.tempPassword!); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                    {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />} {copied ? "복사됨" : "복사"}
                  </button>
                  <span className="text-xs text-muted-foreground">(이 화면을 닫으면 다시 볼 수 없어요)</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
