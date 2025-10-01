const MAX_LOGO_SIZE_BYTES = 5 * 1024 * 1024;

const ALLOWED_LOGO_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const ALLOWED_LOGO_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp"]);

function sanitizeExtension(value: string) {
  return value.replace(/[^a-z0-9]/gi, "").toLowerCase();
}

function extractNameWithoutExtension(fileName: string | null | undefined) {
  if (!fileName) {
    return "";
  }
  const trimmed = fileName.trim();
  if (!trimmed) {
    return "";
  }
  if (!trimmed.includes(".")) {
    return trimmed;
  }
  return trimmed.slice(0, trimmed.lastIndexOf("."));
}

export function slugifyLogoName(value: string | null | undefined) {
  const fallback = "logo";
  const input = (value ?? "").trim();
  if (!input) {
    return fallback;
  }
  const slug = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return slug || fallback;
}

export function resolveLogoExtension({
  mimeType,
  originalFileName,
}: {
  mimeType?: string | null;
  originalFileName?: string | null;
}) {
  if (mimeType) {
    const mimeExt = sanitizeExtension(mimeType.split("/").pop() ?? "");
    if (mimeExt && ALLOWED_LOGO_EXTENSIONS.has(mimeExt)) {
      return mimeExt;
    }
  }

  if (originalFileName) {
    const nameExt = sanitizeExtension(originalFileName.split(".").pop() ?? "");
    if (nameExt && ALLOWED_LOGO_EXTENSIONS.has(nameExt)) {
      return nameExt;
    }
  }

  return "png";
}

export function buildStoredLogoFileName({
  tenantName,
  originalFileName,
  mimeType,
  timestamp = Date.now(),
}: {
  tenantName?: string | null;
  originalFileName?: string | null;
  mimeType?: string | null;
  timestamp?: number;
}) {
  const baseCandidate = tenantName?.trim() || extractNameWithoutExtension(originalFileName) || "logo";
  const slug = slugifyLogoName(baseCandidate);
  const extension = resolveLogoExtension({ mimeType, originalFileName });
  const storedFileName = `${timestamp}-${slug}.${extension}`;
  return { storedFileName, extension, slug };
}

export function validateLogoPayload({
  size,
  mimeType,
  originalFileName,
}: {
  size: number;
  mimeType?: string | null;
  originalFileName?: string | null;
}) {
  if (!size) {
    return "Logo 文件内容为空";
  }
  if (size > MAX_LOGO_SIZE_BYTES) {
    return "Logo 图片大小不能超过 5 MB";
  }

  const extension = resolveLogoExtension({ mimeType, originalFileName });
  const hasAllowedMimeType = mimeType ? ALLOWED_LOGO_MIME_TYPES.has(mimeType.toLowerCase()) : false;
  const hasAllowedExtension = ALLOWED_LOGO_EXTENSIONS.has(extension);

  if (!hasAllowedMimeType && !hasAllowedExtension) {
    return "仅支持 PNG、JPG、JPEG 或 WebP 格式的 Logo";
  }

  return null;
}

export const logoStorageConfig = {
  bucket: "logos",
  maxSizeBytes: MAX_LOGO_SIZE_BYTES,
};
