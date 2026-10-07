"use client";
import { authErrorMessage } from "@/lib/auth-errors";
import { completeEmail, suggestEmail } from "@/lib/email-typo";
import { readAttribution } from "@/lib/attribution";
import { trackClient } from "@/lib/analytics";
import type { AdvertiserKind } from "@/lib/advertiser-kind";
import { normalizeChannelUrl } from "@/lib/channel-url";
import { authDict } from "@/lib/i18n/app/auth";
import type { Locale } from "@/lib/i18n/config";
import { advertiserKindsFor } from "@/lib/advertiser-kind";
import { categoryLabel, regionLabel } from "@/lib/i18n/app/catalog";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Building2, Sparkles, Loader2, MailCheck } from "lucide-react";

type Role = "advertiser" | "influencer";

type RegionOption = { id: string; code: string; name: string; flag: string };
type ChannelOption = { id: string; slug: string; name: string };
type CategoryOption = { id: string; slug?: string | null; name: string; emoji: string | null };

export function SignupForm({
  regions,
  channelTypes,
  categories,
  initialRole = null,
  redirectTo = null,
  refId = null,
  locale = "ko",
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
  /** 화면 언어(ko/en/zh) — 가입 메타데이터 locale 로도 저장된다 */
  locale?: Locale;
}) {
  const t = authDict[locale].signup;
  const router = useRouter();
  const [role, setRole] = useState<Role>(initialRole ?? "advertiser");
  const [step, setStep] = useState<"role" | "form" | "check_email">(
    initialRole ? "form" : "role"
  );

  return (
    <div>
      {step === "role" && (
        <RoleStep selected={role} onSelect={setRole} onNext={() => setStep("form")} t={t} />
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
          locale={locale}
        />
      )}
      {step === "check_email" && <CheckEmailStep t={t} />}
    </div>
  );
}

type T = (typeof authDict)["ko"]["signup"];

function RoleStep({
  selected,
  onSelect,
  onNext,
  t,
}: {
  selected: Role;
  onSelect: (r: Role) => void;
  onNext: () => void;
  t: T;
}) {
  return (
    <div className="space-y-4">
      <RoleCard
        active={selected === "advertiser"}
        onClick={() => onSelect("advertiser")}
        icon={<Building2 className="size-5" />}
        label={t.roleAdvertiser}
        desc={t.roleAdvertiserDesc}
      />
      <RoleCard
        active={selected === "influencer"}
        onClick={() => onSelect("influencer")}
        icon={<Sparkles className="size-5" />}
        label={t.roleInfluencer}
        desc={t.roleInfluencerDesc}
      />
      <button
        onClick={onNext}
        className="mt-2 w-full rounded-full bg-foreground px-6 py-3.5 text-sm font-medium text-background"
      >
        {t.next}
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
  locale,
}: {
  role: Role;
  refId?: string | null;
  regions: RegionOption[];
  channelTypes: ChannelOption[];
  categories: CategoryOption[];
  onBack: () => void;
  onSignedIn: () => void;
  onNeedConfirm: () => void;
  locale: Locale;
}) {
  const t = authDict[locale].signup;
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
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // 광고주는 사업자등록번호 필수 + 형식 검증 (하이픈 허용, 숫자 10자리)
    if (role === "advertiser") {
      const digits = businessNumber.replace(/-/g, "");
      if (!/^\d{10}$/.test(digits)) {
        setError(t.errBusinessNumber);
        return;
      }
    }

    // 크리에이터는 채널 URL 필수 — 없으면 검수·승인 자체가 불가능해 가입이 무의미하다.
    // @아이디만 적어도 플랫폼 프로필 URL 로 완성한다.
    let normalizedChannelUrl: string | null = null;
    if (role === "influencer") {
      const slug = channelTypes.find((c) => c.id === channelTypeId)?.slug ?? "";
      normalizedChannelUrl = normalizeChannelUrl(channelUrl, slug);
      if (!normalizedChannelUrl) {
        setError(t.errChannelUrl);
        return;
      }
    }

    setLoading(true);

    const supabase = createClient();

    // All metadata goes into raw_user_meta_data — DB trigger handles row creation
    const metadata: Record<string, string | object> = {
      role,
      name,
      phone,
      locale, // profiles.locale — 알림·이메일 언어의 기준
    };
    if (refId) metadata.referred_by = refId;
    const source = readAttribution();
    if (source) metadata.signup_source = source; // 첫 터치 가입 경로 → profiles.signup_source
    if (role === "advertiser") {
      metadata.advertiser_kind = advertiserKind;
      metadata.company_name = companyName;
      // 저장은 표준 표기(000-00-00000)로 정규화
      const d = businessNumber.replace(/-/g, "");
      metadata.business_number = `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
    } else {
      metadata.region_id = regionId;
      metadata.channel_type_id = channelTypeId;
      metadata.channel_url = normalizedChannelUrl ?? "";
      metadata.category_ids = categoryIds.join(",");
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      // 인증 링크를 누르면 로그인 페이지로 (verified=1 이면 완료 배너 표시)
      options: { data: metadata, emailRedirectTo: `${window.location.origin}/login?verified=1${locale === "ko" ? "" : `&lang=${locale}`}` },
    });

    setLoading(false);

    if (error) {
      setError(authErrorMessage(error, t.errFailed, locale));
      return;
    }

    // 이미 가입된(인증까지 끝난) 이메일이면 Supabase 는 보안상 성공한 척 응답하고 메일을 보내지 않는다
    // — 이때 user.identities 가 빈 배열이다. 인증 대기 화면으로 보내면 오지 않을 메일을 기다리게 된다.
    if (data.user && (data.user.identities?.length ?? 0) === 0) {
      setAlreadyRegistered(true);
      setError(t.errAlready);
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
          {t.changeRole}
        </button>
        <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
          {role === "advertiser" ? t.badgeAdvertiser : t.badgeInfluencer}
        </span>
      </div>

      <Field label={t.email} type="email" value={email} onChange={setEmail} required />
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
            {t.suggestBefore}<b>{fixed}</b>{t.suggestAfter}
          </button>
        ) : null;
      })()}
      <Field
        label={t.password}
        type="password"
        value={password}
        onChange={setPassword}
        required
        minLength={8}
      />
      <Field
        label={role === "advertiser" ? t.nameAdvertiser : t.nameInfluencer}
        type="text"
        value={name}
        onChange={setName}
        required
      />
      <Field label={t.phone} type="tel" value={phone} onChange={setPhone} />

      {role === "advertiser" ? (
        <>
          <div>
            <label className="text-xs font-medium text-muted-foreground">{t.advertiserKind}</label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {advertiserKindsFor(locale).map((k) => {
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
                {t.agencyHint}
              </p>
            )}
          </div>
          <Field
            label={advertiserKind === "agency" ? t.agencyName : t.companyName}
            type="text"
            value={companyName}
            onChange={setCompanyName}
            required
          />
          <Field
            label={t.businessNumber}
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
            label={t.region}
            value={regionId}
            onChange={setRegionId}
            options={regions.map((r) => ({ value: r.id, label: `${r.flag} ${regionLabel(r, locale)}` }))}
          />
          <SelectField
            label={t.channel}
            value={channelTypeId}
            onChange={setChannelTypeId}
            options={channelTypes.map((c) => ({ value: c.id, label: c.name }))}
          />
          <Field
            label={t.channelUrl}
            type="text"
            value={channelUrl}
            onChange={setChannelUrl}
            required
            placeholder={channelPlaceholder(channelTypes.find((c) => c.id === channelTypeId)?.slug, t)}
            hint={t.channelUrlHint}
          />
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              {t.categories(categoryIds.length)}
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
                    {c.emoji} {categoryLabel(c, locale)}
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              {t.categoriesHint}
            </p>
          </div>
        </>
      )}

      {error && (
        <div className="rounded-2xl border border-accent/30 bg-accent-soft px-4 py-3 text-sm text-accent-ink">
          {error}
          {alreadyRegistered && (
            <div className="mt-2 flex flex-wrap gap-3 text-sm font-medium">
              <a href={locale === "ko" ? "/login" : `/login?lang=${locale}`} className="underline underline-offset-2">{t.goLogin}</a>
              <a href={locale === "ko" ? "/forgot-password" : `/forgot-password?lang=${locale}`} className="underline underline-offset-2">{t.resetPw}</a>
            </div>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="btn-neon flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-bold disabled:opacity-60"
      >
        {loading && <Loader2 className="size-4 animate-spin" />}
        {t.submit}
      </button>

      {role === "influencer" && (
        <p className="text-xs text-muted-foreground">
          {t.influencerNote}
        </p>
      )}
    </form>
  );
}

function CheckEmailStep({ t }: { t: T }) {
  return (
    <div className="rounded-3xl border border-border bg-muted/40 p-8 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-accent-soft text-accent-ink">
        <MailCheck className="size-6" />
      </div>
      <h3 className="mt-5 text-lg font-semibold">{t.checkEmailTitle}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{t.checkEmailBody}</p>
    </div>
  );
}

/** 플랫폼별 입력 예시 — 아이디만 적어도 된다는 걸 placeholder 로 보여준다 */
function channelPlaceholder(slug: string | undefined, t: T) {
  switch (slug) {
    case "youtube":
      return t.placeholder.youtube;
    case "tiktok":
      return t.placeholder.tiktok;
    case "blog":
      return t.placeholder.blog;
    case "xiaohongshu":
      return t.placeholder.xiaohongshu;
    default:
      return t.placeholder.default;
  }
}

function Field({
  label,
  type,
  value,
  onChange,
  required,
  minLength,
  placeholder,
  hint,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  minLength?: number;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
        {label}
        {required && <span className="ml-0.5 text-accent-ink">*</span>}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        minLength={minLength}
        placeholder={placeholder}
        className="w-full rounded-2xl glass-card px-4 py-3 text-sm outline-none transition-colors focus:border-foreground"
      />
      {hint && <small className="mt-1.5 block text-xs leading-relaxed text-muted-foreground">{hint}</small>}
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
