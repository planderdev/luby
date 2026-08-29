"use client";
import { authErrorMessage } from "@/lib/auth-errors";
import { completeEmail, suggestEmail } from "@/lib/email-typo";
import { trackClient } from "@/lib/analytics";
import { ADVERTISER_KINDS, type AdvertiserKind } from "@/lib/advertiser-kind";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Building2, Sparkles, Loader2, MailCheck } from "lucide-react";

type Role = "advertiser" | "influencer";

type RegionOption = { id: string; code: string; name: string; flag: string };
type ChannelOption = { id: string; slug: string; name: string };
type CategoryOption = { id: string; name: string; emoji: string | null };

export function SignupForm({
  regions,
  channelTypes,
  categories,
  initialRole = null,
  redirectTo = null,
  refId = null,
}: {
  regions: RegionOption[];
  channelTypes: ChannelOption[];
  categories: CategoryOption[];
  /** 랜딩 CTA에서 역할을 정하고 들어온 경우 — 역할 선택 단계를 건너뛴다 */
  initialRole?: Role | null;
  /** 가입 후 이동할 내부 경로 (공개 캠페인 → 가입 → 다시 캠페인) */
  redirectTo?: string | null;
  /** 추천인(공유한 크리에이터) id — profiles.referred_by 로 저장 */
  refId?: string | null;
}) {
  const router = useRouter();
  const [role, setRole] = useState<Role>(initialRole ?? "advertiser");
  const [step, setStep] = useState<"role" | "form" | "check_email">(
    initialRole ? "form" : "role"
  );

  return (
    <div>
      {step === "role" && (
        <RoleStep selected={role} onSelect={setRole} onNext={() => setStep("form")} />
      )}
      {step === "form" && (
        <FormStep
          role={role}
          refId={refId}
          regions={regions}
          channelTypes={channelTypes}
          categories={categories}
          onBack={() => setStep("role")}
          onSignedIn={() => router.push(redirectTo ?? "/dashboard")}
          onNeedConfirm={() => setStep("check_email")}
        />
      )}
      {step === "check_email" && <CheckEmailStep />}
    </div>
  );
}

function RoleStep({
  selected,
  onSelect,
  onNext,
}: {
  selected: Role;
  onSelect: (r: Role) => void;
  onNext: () => void;
}) {
  return (
    <div className="space-y-4">
      <RoleCard
        active={selected === "advertiser"}
        onClick={() => onSelect("advertiser")}
        icon={<Building2 className="size-5" />}
        label="광고주 (브랜드)"
        desc="제품·매장을 알리고 인플루언서를 모집합니다."
      />
      <RoleCard
        active={selected === "influencer"}
        onClick={() => onSelect("influencer")}
        icon={<Sparkles className="size-5" />}
        label="인플루언서 (크리에이터)"
        desc="원하는 캠페인에 응모하고 체험 후 콘텐츠를 발행합니다."
      />
      <button
        onClick={onNext}
        className="mt-2 w-full rounded-full bg-foreground px-6 py-3.5 text-sm font-medium text-background"
      >
        다음으로
      </button>
    </div>
  );
}

function RoleCard({
  active,
  onClick,
  icon,
  label,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  desc: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`group flex w-full items-start gap-4 rounded-2xl border px-5 py-4 text-left transition-colors ${
        active ? "border-foreground bg-muted/60" : "border-border bg-background hover:bg-muted/40"
      }`}
    >
      <span
        className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
          active ? "bg-foreground text-background" : "bg-muted text-foreground"
        }`}
      >
        {icon}
      </span>
      <span className="flex-1">
        <span className="block text-sm font-semibold">{label}</span>
        <span className="mt-1 block text-xs text-muted-foreground">{desc}</span>
      </span>
      <span
        className={`mt-1 size-4 shrink-0 rounded-full border ${
          active ? "border-foreground bg-foreground" : "border-border"
        }`}
      />
    </button>
  );
}

function FormStep({
  role,
  refId = null,
  regions,
  channelTypes,
  categories,
  onBack,
  onSignedIn,
  onNeedConfirm,
}: {
  role: Role;
  refId?: string | null;
  regions: RegionOption[];
  channelTypes: ChannelOption[];
  categories: CategoryOption[];
  onBack: () => void;
  onSignedIn: () => void;
  onNeedConfirm: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const [companyName, setCompanyName] = useState("");
  const [businessNumber, setBusinessNumber] = useState("");
  const [advertiserKind, setAdvertiserKind] = useState<AdvertiserKind>("brand");

  const [regionId, setRegionId] = useState(regions[0]?.id ?? "");
  const [channelTypeId, setChannelTypeId] = useState(channelTypes[0]?.id ?? "");
  const [channelUrl, setChannelUrl] = useState("");
  const [categoryIds, setCategoryIds] = useState<string[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // 광고주는 사업자등록번호 필수 + 형식 검증 (하이픈 허용, 숫자 10자리)
    if (role === "advertiser") {
      const digits = businessNumber.replace(/-/g, "");
      if (!/^\d{10}$/.test(digits)) {
        setError("사업자등록번호는 숫자 10자리로 입력해주세요. (예: 123-45-67890)");
        return;
      }
    }

    setLoading(true);

    const supabase = createClient();

    // All metadata goes into raw_user_meta_data — DB trigger handles row creation
    const metadata: Record<string, string> = {
      role,
      name,
      phone,
    };
    if (refId) metadata.referred_by = refId;
    if (role === "advertiser") {
      metadata.advertiser_kind = advertiserKind;
      metadata.company_name = companyName;
      // 저장은 표준 표기(000-00-00000)로 정규화
      const d = businessNumber.replace(/-/g, "");
      metadata.business_number = `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
    } else {
      metadata.region_id = regionId;
      metadata.channel_type_id = channelTypeId;
      metadata.channel_url = channelUrl;
      metadata.category_ids = categoryIds.join(",");
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata },
    });

    setLoading(false);

    if (error) {
      setError(authErrorMessage(error, "가입에 실패했어요. 입력값을 확인하고 다시 시도해 주세요."));
      return;
    }

    trackClient("signup_completed", { role, referred: refId ? "yes" : "no" });

    if (data.session) {
      onSignedIn();
    } else {
      // Email confirmation required
      onNeedConfirm();
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="-ml-2 rounded-full px-2 py-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          ← 역할 변경
        </button>
        <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
          {role === "advertiser" ? "광고주" : "인플루언서"}
        </span>
      </div>

      <Field label="이메일" type="email" value={email} onChange={setEmail} required />
      {(() => {
        // 오타 주소로 가입하면 인증 메일이 영영 닿지 않는다 — 제출은 막지 않고 제안만.
        // 도메인을 치는 중에는 자동완성 칩("@g" → gmail.com), 다 쳤는데 오타면 교정 힌트.
        const completions = completeEmail(email);
        if (completions.length > 0) {
          return (
            <div className="-mt-3 flex flex-wrap gap-1.5">
              {completions.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setEmail(c)}
                  className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground hover:border-foreground hover:text-foreground"
                >
                  {c}
                </button>
              ))}
            </div>
          );
        }
        const fixed = suggestEmail(email);
        return fixed ? (
          <button
            type="button"
            onClick={() => setEmail(fixed)}
            className="-mt-3 block text-left text-xs text-accent-ink underline underline-offset-2"
          >
            혹시 <b>{fixed}</b> 아닌가요? 눌러서 바꾸기
          </button>
        ) : null;
      })()}
      <Field
        label="비밀번호 (8자 이상)"
        type="password"
        value={password}
        onChange={setPassword}
        required
        minLength={8}
      />
      <Field
        label={role === "advertiser" ? "담당자 이름" : "이름·닉네임"}
        type="text"
        value={name}
        onChange={setName}
        required
      />
      <Field label="연락처 (선택)" type="tel" value={phone} onChange={setPhone} />

      {role === "advertiser" ? (
        <>
          <div>
            <label className="text-xs font-medium text-muted-foreground">광고주 유형</label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {ADVERTISER_KINDS.map((k) => {
                const on = advertiserKind === k.value;
                return (
                  <button
                    key={k.value}
                    type="button"
                    onClick={() => setAdvertiserKind(k.value)}
                    aria-pressed={on}
                    className={`rounded-2xl border px-4 py-3 text-left transition-colors ${
                      on
                        ? "border-foreground bg-foreground text-background"
                        : "border-border bg-background hover:bg-muted"
                    }`}
                  >
                    <div className="text-sm font-semibold">{k.label}</div>
                    <div className={`mt-0.5 text-xs ${on ? "text-background/70" : "text-muted-foreground"}`}>
                      {k.desc}
                    </div>
                  </button>
                );
              })}
            </div>
            {advertiserKind === "agency" && (
              <p className="mt-2 text-xs text-muted-foreground">
                대행사는 캠페인을 만들 때마다 클라이언트 상호를 따로 입력할 수 있어요. 아래에는 대행사 정보를 적어주세요.
              </p>
            )}
          </div>
          <Field
            label={advertiserKind === "agency" ? "대행사명" : "회사·상호명"}
            type="text"
            value={companyName}
            onChange={setCompanyName}
            required
          />
          <Field
            label="사업자등록번호"
            type="text"
            value={businessNumber}
            onChange={setBusinessNumber}
            required
            placeholder="123-45-67890"
          />
        </>
      ) : (
        <>
          <SelectField
            label="활동 지역"
            value={regionId}
            onChange={setRegionId}
            options={regions.map((r) => ({ value: r.id, label: `${r.flag} ${r.name}` }))}
          />
          <SelectField
            label="대표 SNS 채널"
            value={channelTypeId}
            onChange={setChannelTypeId}
            options={channelTypes.map((c) => ({ value: c.id, label: c.name }))}
          />
          <Field
            label="채널 URL (선택)"
            type="url"
            value={channelUrl}
            onChange={setChannelUrl}
            placeholder="https://instagram.com/..."
          />
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              전문 분야 (최대 3개) · {categoryIds.length}/3
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              {categories.map((c) => {
                const on = categoryIds.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      setCategoryIds((prev) =>
                        on
                          ? prev.filter((x) => x !== c.id)
                          : prev.length >= 3
                            ? prev
                            : [...prev, c.id]
                      )
                    }
                    className={`rounded-full border px-3.5 py-2 text-xs transition-colors ${
                      on
                        ? "border-accent bg-accent-soft font-medium text-accent-ink"
                        : "border-border bg-background text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {c.emoji} {c.name}
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              광고주 검색·AI 매칭에 사용돼요. 나중에 설정에서 바꿀 수 있어요.
            </p>
          </div>
        </>
      )}

      {error && (
        <div className="rounded-2xl border border-accent/30 bg-accent-soft px-4 py-3 text-sm text-accent-ink">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="btn-neon flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-bold disabled:opacity-60"
      >
        {loading && <Loader2 className="size-4 animate-spin" />}
        가입하고 시작하기
      </button>

      {role === "influencer" && (
        <p className="text-xs text-muted-foreground">
          * 인플루언서 계정은 운영자 검수를 거쳐 승인됩니다 (평균 24시간 이내).
        </p>
      )}
    </form>
  );
}

function CheckEmailStep() {
  return (
    <div className="rounded-3xl border border-border bg-muted/40 p-8 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-accent-soft text-accent-ink">
        <MailCheck className="size-6" />
      </div>
      <h3 className="mt-5 text-lg font-semibold">메일함을 확인해주세요</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        가입 확인 메일을 발송했어요. 메일 안의 링크를 눌러 인증을 완료하면 로그인할 수 있습니다.
      </p>
    </div>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
  required,
  minLength,
  placeholder,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  minLength?: number;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        minLength={minLength}
        placeholder={placeholder}
        className="w-full rounded-2xl glass-card px-4 py-3 text-sm outline-none transition-colors focus:border-foreground"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl glass-card px-4 py-3 text-sm outline-none transition-colors focus:border-foreground"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
