"use client";
import { ADVERTISER_KINDS, type AdvertiserKind } from "@/lib/advertiser-kind";

import { useState, useTransition } from "react";
import { Loader2, Check } from "lucide-react";
import { ImageUpload } from "@/components/ImageUpload";
import { updateProfile, type SettingsPayload } from "./actions";

type Region = { id: string; code: string; name: string; flag: string };
type Category = { id: string; name: string; emoji: string | null };

export function SettingsForm({
  profile,
  extra,
  regions,
  categories = [],
}: {
  profile: {
    id: string;
    name: string;
    email: string;
    role: string;
    avatar_url: string | null;
  };
  extra: {
    bio?: string | null;
    region_id?: string | null;
    company_name?: string | null;
    advertiser_kind?: string | null;
    description?: string | null;
    website?: string | null;
    category_id?: string | null;
    representative_name?: string | null;
    business_address?: string | null;
    tax_email?: string | null;
    business_number?: string | null;
  };
  regions: Region[];
  categories?: Category[];
}) {
  const [name, setName] = useState(profile.name ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? "");
  const [bio, setBio] = useState(extra.bio ?? "");
  const [regionId, setRegionId] = useState(extra.region_id ?? "");
  const [companyName, setCompanyName] = useState(extra.company_name ?? "");
  const [advertiserKind, setAdvertiserKind] = useState<AdvertiserKind>(
    extra.advertiser_kind === "agency" ? "agency" : "brand"
  );
  const [description, setDescription] = useState(extra.description ?? "");
  const [website, setWebsite] = useState(extra.website ?? "");
  const [categoryId, setCategoryId] = useState(extra.category_id ?? "");
  const [representativeName, setRepresentativeName] = useState(extra.representative_name ?? "");
  const [businessAddress, setBusinessAddress] = useState(extra.business_address ?? "");
  const [taxEmail, setTaxEmail] = useState(extra.tax_email ?? "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  function save() {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const payload: SettingsPayload = {
        name,
        avatar_url: avatarUrl || null,
        ...(profile.role === "influencer"
          ? { bio: bio || null, region_id: regionId || null }
          : {}),
        ...(profile.role === "advertiser"
          ? {
              company_name: companyName || null,
              advertiser_kind: advertiserKind,
              description: description || null,
              website: website || null,
              category_id: categoryId || null,
              representative_name: representativeName || null,
              business_address: businessAddress || null,
              tax_email: taxEmail || null,
            }
          : {}),
      };
      const result = await updateProfile(payload);
      if (result.ok) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      {/* Avatar column */}
      <div className="rounded-3xl glass-card p-6">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          프로필 사진
        </h3>
        <div className="mt-5 flex justify-center">
          <ImageUpload
            bucket="profile-avatars"
            value={avatarUrl}
            onChange={setAvatarUrl}
            shape="circle"
          />
        </div>
      </div>

      {/* Form column */}
      <div className="rounded-3xl glass-card p-6 lg:p-8">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          기본 정보
        </h3>

        <div className="mt-6 space-y-5">
          <div>
            <label htmlFor="settings-email" className="mb-1.5 block text-xs font-medium text-muted-foreground">
              이메일
            </label>
            <input
              id="settings-email"
              type="email"
              value={profile.email}
              disabled
              className="w-full cursor-not-allowed rounded-2xl border border-border bg-muted px-4 py-3 text-sm text-muted-foreground"
            />
          </div>

          <div>
            <label htmlFor="settings-name" className="mb-1.5 block text-xs font-medium text-muted-foreground">
              이름
            </label>
            <input
              id="settings-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-2xl glass-card px-4 py-3 text-sm outline-none focus:border-foreground"
            />
          </div>

          {profile.role === "influencer" && (
            <>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  활동 지역
                </label>
                <select
                  value={regionId}
                  onChange={(e) => setRegionId(e.target.value)}
                  className="w-full rounded-2xl glass-card px-4 py-3 text-sm outline-none focus:border-foreground"
                >
                  <option value="">선택해주세요</option>
                  {regions.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.flag} {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  자기소개
                  <span className="ml-2 text-muted-foreground/70">— 광고주에게 보여집니다</span>
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="어떤 콘텐츠를 만드시나요? 주력 카테고리·톤을 간단히 적어주세요."
                  rows={4}
                  className="w-full resize-none rounded-2xl glass-card px-4 py-3 text-sm outline-none focus:border-foreground"
                />
              </div>
            </>
          )}

          {profile.role === "advertiser" && (
            <>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">광고주 유형</label>
                <div className="grid grid-cols-2 gap-2">
                  {ADVERTISER_KINDS.map((k) => {
                    const on = advertiserKind === k.value;
                    return (
                      <button
                        key={k.value}
                        type="button"
                        onClick={() => setAdvertiserKind(k.value)}
                        aria-pressed={on}
                        className={`rounded-2xl border px-4 py-3 text-left transition-colors ${
                          on ? "border-foreground bg-foreground text-background" : "border-border bg-background hover:bg-muted"
                        }`}
                      >
                        <div className="text-sm font-semibold">{k.label}</div>
                        <div className={`mt-0.5 text-xs ${on ? "text-background/70" : "text-muted-foreground"}`}>{k.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  {advertiserKind === "agency" ? "대행사명" : "회사명 · 브랜드명"}
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full rounded-2xl glass-card px-4 py-3 text-sm outline-none focus:border-foreground"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">주요 업종</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full rounded-2xl glass-card px-4 py-3 text-sm outline-none focus:border-foreground"
                  >
                    <option value="">선택해주세요</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.emoji} {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">웹사이트 (선택)</label>
                  <input
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://brand.com"
                    className="w-full rounded-2xl glass-card px-4 py-3 text-sm outline-none focus:border-foreground"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  회사 소개
                  <span className="ml-2 text-muted-foreground/70">— 크리에이터가 초대·캠페인에서 보게 됩니다</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={600}
                  placeholder="어떤 브랜드인가요? 주력 제품·고객·크리에이터와 함께하고 싶은 방향을 적어주세요."
                  rows={4}
                  className="w-full resize-none rounded-2xl glass-card px-4 py-3 text-sm outline-none focus:border-foreground"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">{description.length}/600</p>
              </div>

              {/* 세금계산서·청구 정보 */}
              <div className="rounded-2xl border border-border p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">세금계산서 · 청구 정보</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  BUSINESS 결제 시 세금계산서 발행에 사용됩니다. 사업자등록번호{extra.business_number ? ` ${extra.business_number}` : ""}는 가입 시 등록된 값이 사용돼요.
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">대표자명</label>
                    <input type="text" value={representativeName} onChange={(e) => setRepresentativeName(e.target.value)} className="w-full rounded-2xl glass-card px-4 py-3 text-sm outline-none focus:border-foreground" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">세금계산서 수신 이메일</label>
                    <input type="email" value={taxEmail} onChange={(e) => setTaxEmail(e.target.value)} placeholder={profile.email} className="w-full rounded-2xl glass-card px-4 py-3 text-sm outline-none focus:border-foreground" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">사업장 주소</label>
                    <input type="text" value={businessAddress} onChange={(e) => setBusinessAddress(e.target.value)} placeholder="시/도 시/군/구 도로명 상세주소" className="w-full rounded-2xl glass-card px-4 py-3 text-sm outline-none focus:border-foreground" />
                  </div>
                </div>
              </div>
            </>
          )}

          {error && (
            <div className="rounded-xl border border-accent/30 bg-accent-soft px-4 py-3 text-sm text-accent-ink">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between border-t border-border pt-5">
            <span
              className={`flex items-center gap-1.5 text-xs transition-opacity ${
                success ? "opacity-100 text-accent-ink" : "opacity-0"
              }`}
            >
              <Check className="size-3.5" />
              저장됨
            </span>
            <button
              type="button"
              onClick={save}
              disabled={pending || !name.trim()}
              className="inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-2.5 text-sm font-medium text-background disabled:opacity-50"
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              저장
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
