import { createBrowserSupabaseClient } from "@/lib/supabase/client";

let browserSupabase: ReturnType<typeof createBrowserSupabaseClient> | null = null;

const ALLOWED_LOGO_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp']);

export function getBrowserSupabaseClient() {
  if (!browserSupabase) {
    browserSupabase = createBrowserSupabaseClient();
  }
  return browserSupabase;
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function resolveFileExtension(file: File) {
  const mimeExt = file.type?.split("/").pop() ?? "";
  const sanitizedMimeExt = mimeExt.replace(/[^a-z0-9]/gi, "").toLowerCase();
  if (ALLOWED_LOGO_EXTENSIONS.has(sanitizedMimeExt)) {
    return sanitizedMimeExt;
  }

  const nameExt = file.name.includes(".") ? file.name.split(".").pop() ?? "" : "";
  const sanitizedNameExt = nameExt.replace(/[^a-z0-9]/gi, "").toLowerCase();
  if (ALLOWED_LOGO_EXTENSIONS.has(sanitizedNameExt)) {
    return sanitizedNameExt;
  }

  return 'png';
}

// Ensure a public 'logos' bucket exists in Supabase storage before using this helper.
export async function uploadTenantLogoToStorage(file: File, tenantName?: string) {
  const client = getBrowserSupabaseClient();

  const fallbackName = file.name && file.name.includes(".") ? file.name.slice(0, file.name.lastIndexOf(".")) : file.name;
  const candidateName = tenantName?.length ? tenantName : fallbackName || "logo";
  const slugifiedName = slugify(candidateName) || "logo";
  const extension = resolveFileExtension(file);
  const fileName = `${Date.now()}-${slugifiedName}.${extension}`;

  const { data, error } = await client.storage.from("logos").upload(fileName, file, {
    cacheControl: "3600",
    contentType: file.type,
    upsert: false,
  });

  if (error || !data) {
    throw error ?? new Error("Logo upload failed");
  }

  const { data: publicUrlData } = client.storage.from("logos").getPublicUrl(data.path);

  if (!publicUrlData?.publicUrl) {
    throw new Error("Unable to resolve public URL for uploaded logo");
  }

  return {
    publicUrl: publicUrlData.publicUrl,
    storagePath: data.path,
    storedFileName: fileName,
  };
}


