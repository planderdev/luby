"use client";

import { useState, useRef, useCallback, type DragEvent } from "react";
import { dbErrorWith } from "@/lib/db-errors";
import Image from "next/image";
import { Upload, X, Loader2, ImageIcon, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { prepareImage, RESIZE_PRESET, fmtBytes } from "@/lib/image-resize";

type Bucket = "campaign-thumbnails" | "profile-avatars" | "notice-images";
type UploadLocale = "ko" | "en" | "zh";

/** 업로드 UI 문구 — 설정(크리에이터)에서 locale 을 넘기면 영문·중문, 그 외 화면은 한국어 기본 */
const UI: Record<UploadLocale, {
  label: (formats: string, mb: number) => string;
  unsupported: (label: string) => string;
  tooBig: (mb: number) => string;
  rawTooBig: (mb: number) => string;
  needLogin: string;
  uploadFailed: string;
  optimized: string;
  remove: string;
  uploadAria: (label: string) => string;
  uploading: string;
  clickOrDrag: string;
  fileAria: (label: string) => string;
  change: string;
  choose: string;
}> = {
  ko: {
    label: (f, mb) => `${f} · 최대 ${mb}MB (자동 최적화)`,
    unsupported: (l) => `지원하지 않는 형식입니다. (${l})`,
    tooBig: (mb) => `파일이 너무 큽니다. (최대 ${mb}MB)`,
    rawTooBig: (mb) => `이 형식은 압축되지 않아 최대 ${mb}MB 까지만 올릴 수 있어요.`,
    needLogin: "로그인이 필요합니다.",
    uploadFailed: "업로드에 실패했어요. 잠시 후 다시 시도해 주세요.",
    optimized: "최적화됨",
    remove: "이미지 제거",
    uploadAria: (l) => `${l} 업로드`,
    uploading: "업로드 중...",
    clickOrDrag: "클릭 또는 드래그하여 업로드",
    fileAria: (l) => `${l} 파일 선택`,
    change: "사진 변경",
    choose: "사진 선택",
  },
  en: {
    label: (f, mb) => `${f} · up to ${mb}MB (auto-optimized)`,
    unsupported: (l) => `Unsupported format. (${l})`,
    tooBig: (mb) => `File is too large. (max ${mb}MB)`,
    rawTooBig: (mb) => `This format is not compressed, so the limit is ${mb}MB.`,
    needLogin: "Please log in.",
    uploadFailed: "Upload failed. Please try again shortly.",
    optimized: "Optimized",
    remove: "Remove image",
    uploadAria: (l) => `Upload ${l}`,
    uploading: "Uploading...",
    clickOrDrag: "Click or drag to upload",
    fileAria: (l) => `Choose file (${l})`,
    change: "Change photo",
    choose: "Choose photo",
  },
  zh: {
    label: (f, mb) => `${f} · 最大 ${mb}MB（自动优化）`,
    unsupported: (l) => `不支持的格式。（${l}）`,
    tooBig: (mb) => `文件过大。（最大 ${mb}MB）`,
    rawTooBig: (mb) => `此格式不会被压缩，最多只能上传 ${mb}MB。`,
    needLogin: "请先登录。",
    uploadFailed: "上传失败，请稍后重试。",
    optimized: "已优化",
    remove: "删除图片",
    uploadAria: (l) => `上传 ${l}`,
    uploading: "上传中...",
    clickOrDrag: "点击或拖拽上传",
    fileAria: (l) => `选择文件（${l}）`,
    change: "更换照片",
    choose: "选择照片",
  },
};

const BUCKET_CONFIG: Record<
  Bucket,
  { maxSize: number; rawMaxSize: number; mimeTypes: string[]; formats: string }
> = {
  // maxSize 는 원본 기준 — 정적 이미지는 업로드 전에 브라우저에서 리사이즈·WebP 압축되므로 스마트폰 원본도 허용.
  // GIF 는 압축하지 않으므로 버킷 한도(5MB)를 그대로 적용.
  "campaign-thumbnails": {
    maxSize: 15 * 1024 * 1024,
    rawMaxSize: 5 * 1024 * 1024,
    mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    formats: "JPG, PNG, WEBP, GIF",
  },
  "profile-avatars": {
    maxSize: 10 * 1024 * 1024,
    rawMaxSize: 2 * 1024 * 1024,
    mimeTypes: ["image/jpeg", "image/png", "image/webp"],
    formats: "JPG, PNG, WEBP",
  },
  "notice-images": {
    maxSize: 15 * 1024 * 1024,
    rawMaxSize: 5 * 1024 * 1024,
    mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    formats: "JPG, PNG, WEBP, GIF",
  },
};

export function ImageUpload({
  bucket,
  value,
  onChange,
  shape = "rect",
  className,
  hint,
  locale = "ko",
}: {
  bucket: Bucket;
  value: string;
  onChange: (url: string) => void;
  /** rect = 16:9 thumbnail, circle = round avatar */
  shape?: "rect" | "circle";
  className?: string;
  hint?: string;
  locale?: UploadLocale;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const cfg = BUCKET_CONFIG[bucket];
  const t = UI[locale];
  const label = t.label(cfg.formats, Math.round(cfg.maxSize / 1024 / 1024));

  const upload = useCallback(
    async (file: File) => {
      setError(null);

      if (!cfg.mimeTypes.includes(file.type)) {
        setError(t.unsupported(label));
        return;
      }
      if (file.size > cfg.maxSize) {
        setError(t.tooBig(Math.round(cfg.maxSize / 1024 / 1024)));
        return;
      }

      setUploading(true);
      setNote(null);
      // 업로드 전 리사이즈·압축 (GIF/SVG 는 원본 유지)
      const prepared = await prepareImage(file, RESIZE_PRESET[bucket]);
      if (!prepared.optimized && prepared.blob.size > cfg.rawMaxSize) {
        setError(t.rawTooBig(Math.round(cfg.rawMaxSize / 1024 / 1024)));
        setUploading(false);
        return;
      }
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError(t.needLogin);
        setUploading(false);
        return;
      }

      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${prepared.ext}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, prepared.blob, {
          cacheControl: "31536000",
          upsert: false,
          contentType: prepared.contentType,
        });

      if (uploadError) {
        setError(locale === "ko" ? dbErrorWith("업로드 실패", uploadError, t.uploadFailed) : t.uploadFailed);
        setUploading(false);
        return;
      }

      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
      onChange(urlData.publicUrl);
      if (prepared.optimized) setNote(`${t.optimized} · ${fmtBytes(file.size)} → ${fmtBytes(prepared.blob.size)}${prepared.width ? ` · ${prepared.width}×${prepared.height}` : ""}`);
      setUploading(false);
    },
    [bucket, cfg, onChange, t, label, locale]
  );

  function handleFile(file: File | undefined | null) {
    if (file) void upload(file);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragActive(false);
    handleFile(e.dataTransfer.files?.[0]);
  }

  function clear() {
    onChange("");
    setError(null);
    setNote(null);
  }

  const isCircle = shape === "circle";
  const containerClass = isCircle
    ? "size-28 rounded-full"
    : "aspect-[16/9] w-full rounded-2xl";

  return (
    <div className={className}>
      <div
        onDragEnter={() => setDragActive(true)}
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={onDrop}
        className={`relative ${containerClass} overflow-hidden border-2 border-dashed transition-colors ${
          dragActive
            ? "border-accent bg-accent-soft"
            : value
              ? "border-border bg-muted"
              : "border-border bg-muted/40 hover:bg-muted/70"
        }`}
      >
        {value ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt="uploaded"
              className="size-full object-cover"
            />
            <button
              type="button"
              onClick={clear}
              className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-colors hover:bg-black/80"
              aria-label={t.remove}
            >
              <X className="size-4" />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            aria-label={t.uploadAria(label)}
            className="flex size-full flex-col items-center justify-center gap-2 px-4 text-center"
          >
            {uploading ? (
              <>
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{t.uploading}</span>
              </>
            ) : (
              <>
                <div className="flex size-10 items-center justify-center rounded-xl bg-background">
                  {isCircle ? (
                    <ImageIcon className="size-5 text-muted-foreground" />
                  ) : (
                    <Upload className="size-5 text-muted-foreground" />
                  )}
                </div>
                {!isCircle && (
                  <>
                    <span className="text-sm font-medium">{t.clickOrDrag}</span>
                    <span className="text-[11px] text-muted-foreground">{label}</span>
                  </>
                )}
              </>
            )}
          </button>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={cfg.mimeTypes.join(",")}
          aria-label={t.fileAria(label)}
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>

      {/* For circle: show button below */}
      {isCircle && (
        <div className="mt-3 flex flex-col items-center gap-1">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="rounded-full border border-border bg-background px-4 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
          >
            {uploading ? t.uploading : value ? t.change : t.choose}
          </button>
          <span className="text-[11px] text-muted-foreground">{label}</span>
        </div>
      )}

      {note && !error && (
        <p className="mt-2 text-[11px] text-success">{note}</p>
      )}
      {hint && !error && (
        <p className="mt-2 text-xs text-muted-foreground">{hint}</p>
      )}
      {error && (
        <div className="mt-2 flex items-start gap-2 rounded-xl border border-accent/30 bg-accent-soft px-3 py-2 text-xs text-accent-ink">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
