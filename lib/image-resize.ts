/**
 * 브라우저 측 이미지 최적화 — 업로드 전에 리사이즈·WebP 압축.
 * 스마트폰 원본(3~8MB)을 수백 KB 로 줄여 디렉터리/OG/카드 로딩과 스토리지 비용을 낮춘다.
 * GIF(애니메이션)·SVG 는 손대지 않고 그대로 올린다.
 */
export type ResizeOptions = { maxWidth: number; maxHeight: number; quality: number };

export const RESIZE_PRESET: Record<"campaign-thumbnails" | "profile-avatars" | "notice-images", ResizeOptions> = {
  "campaign-thumbnails": { maxWidth: 1600, maxHeight: 1200, quality: 0.82 },
  "profile-avatars": { maxWidth: 512, maxHeight: 512, quality: 0.85 },
  // 공지 팝업은 세로로 긴 이미지가 많아 높이를 넉넉히 둔다
  "notice-images": { maxWidth: 1200, maxHeight: 1800, quality: 0.85 },
};

export type PreparedImage = { blob: Blob; ext: string; contentType: string; width: number; height: number; optimized: boolean };

const SKIP_TYPES = new Set(["image/gif", "image/svg+xml"]);

export async function prepareImage(file: File, opts: ResizeOptions): Promise<PreparedImage> {
  const passthrough = (): PreparedImage => ({
    blob: file,
    ext: (file.name.split(".").pop() ?? "jpg").toLowerCase(),
    contentType: file.type,
    width: 0,
    height: 0,
    optimized: false,
  });
  if (SKIP_TYPES.has(file.type) || typeof createImageBitmap !== "function") return passthrough();

  let bitmap: ImageBitmap;
  try {
    // EXIF 회전을 반영해 디코드 (옵션 미지원 브라우저는 기본 동작)
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions).catch(() => createImageBitmap(file));
  } catch {
    return passthrough();
  }

  const scale = Math.min(1, opts.maxWidth / bitmap.width, opts.maxHeight / bitmap.height);
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  // 이미 작고 가벼우면 그대로
  if (scale === 1 && file.size < 400 * 1024) {
    bitmap.close();
    return { ...passthrough(), width, height };
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return passthrough();
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const toBlob = (type: string, quality: number) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

  let blob = await toBlob("image/webp", opts.quality);
  let ext = "webp";
  let contentType = "image/webp";
  // WebP 인코딩 미지원 브라우저 폴백
  if (!blob || blob.type !== "image/webp") {
    blob = await toBlob("image/jpeg", opts.quality);
    ext = "jpg";
    contentType = "image/jpeg";
  }
  if (!blob) return passthrough();
  // 압축 결과가 원본보다 크면(이미 최적화된 PNG 등) 원본 유지
  if (blob.size >= file.size && scale === 1) return { ...passthrough(), width, height };

  return { blob, ext, contentType, width, height, optimized: true };
}

export const fmtBytes = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)}MB` : `${Math.round(n / 1024)}KB`);
