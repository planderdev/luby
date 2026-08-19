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
  const [sendInvite, setSendInvite] = useState(true);
  const [result, setResult] = useState<{ invited: boolean; tempPassword?: string; email: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();
  const input = "w-full rounded-2xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-foreground";

  function submit() {
    setError(null);
    setResult(null);
    startTransition(async () => {
      const r = await inviteMember({ email, name, role, advertiserKind: kind, companyName, businessNumber, regionId: role === "influencer" ? regionId : null, phone, sendInvite });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setResult({ invited: r.invited, tempPassword: r.tempPassword, email: email.trim().toLowerCase() });
      setEmail(""); setName(""); setPhone(""); setCompanyName(""); setBusinessNumber("");
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
          <label className="mt-4 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={sendInvite} onChange={(e) => setSendInvite(e.target.checked)} className="size-4" />
            초대 메일 보내기 (비밀번호 설정 링크) — 끄면 임시 비밀번호를 생성해 직접 전달
          </label>
          <p className="mt-1 text-xs text-muted-foreground">크리에이터는 운영자가 추가하므로 바로 승인 상태로 생성됩니다. 광고주는 가입 즉시 활동 가능합니다.</p>
          {ADVERTISER_KINDS.length > 0 && role === "advertiser" && kind === "agency" && <p className="mt-1 text-xs text-muted-foreground">대행사는 캠페인마다 클라이언트 상호를 따로 입력할 수 있어요.</p>}
          <div className="mt-4 flex items-center gap-2">
            <button type="button" onClick={submit} disabled={pending} className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background disabled:opacity-60">
              {pending ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />} {sendInvite ? "초대 보내기" : "계정 생성"}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="rounded-full px-3 py-2 text-sm text-muted-foreground hover:text-foreground">닫기</button>
          </div>
          {error && <p className="mt-3 text-sm text-danger">{error}</p>}
          {result && (
            <div className="mt-3 rounded-2xl bg-success-soft px-4 py-3 text-sm text-success">
              <div className="flex items-center gap-2"><Check className="size-4" /> {result.email} 추가 완료{result.invited ? " — 초대 메일을 보냈어요 (링크에서 비밀번호 설정)" : " — 임시 비밀번호를 전달하세요"}</div>
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
