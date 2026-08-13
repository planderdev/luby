"use client";

import { useState, useTransition } from "react";
import { Loader2, Check } from "lucide-react";
import { ImageUpload } from "@/components/ImageUpload";
import { updateProfile, type SettingsPayload } from "./actions";

type Region = { id: string; code: string; name: string; flag: string };

export function SettingsForm({
  profile,
  extra,
  regions,
}: {
  profile: {
    id: string;
    name: string;
    email: string;
    role: string;
    avatar_url: string | null;
  };
  extra: { bio?: string | null; region_id?: string | null };
  regions: Region[];
}) {
  const [name, setName] = useState(profile.name ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? "");
  const [bio, setBio] = useState(extra.bio ?? "");
  const [regionId, setRegionId] = useState(extra.region_id ?? "");
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
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              이메일
            </label>
            <input
              type="email"
              value={profile.email}
              disabled
              className="w-full cursor-not-allowed rounded-2xl border border-border bg-muted px-4 py-3 text-sm text-muted-foreground"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              이름
            </label>
            <input
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
