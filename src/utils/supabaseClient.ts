import { createBrowserSupabaseClient } from "@/lib/supabase/client";

let browserSupabase: ReturnType<typeof createBrowserSupabaseClient> | null = null;

export function getBrowserSupabaseClient() {
  if (!browserSupabase) {
    browserSupabase = createBrowserSupabaseClient();
  }
  return browserSupabase;
}

type UploadLogoSuccessPayload = {
  publicUrl: string;
  storagePath: string;
  storedFileName: string;
};

type UploadLogoErrorPayload = {
  message?: string;
};

export async function uploadTenantLogoToStorage(file: File, tenantName?: string) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("originalFileName", file.name);
  formData.append("mimeType", file.type);

  if (tenantName?.trim()) {
    formData.append("tenantName", tenantName.trim());
  }

  let response: Response;
  try {
    response = await fetch("/api/storage/upload-tenant-logo", {
      method: "POST",
      body: formData,
      credentials: "include",
    });
  } catch (error) {
    console.error("[logo-upload] request failed", error);
    throw new Error("Logo 上传失败，请稍后再试");
  }

  let payload: UploadLogoSuccessPayload | UploadLogoErrorPayload | null = null;
  try {
    payload = (await response.json()) as UploadLogoSuccessPayload | UploadLogoErrorPayload;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message = payload && typeof payload === "object" && typeof payload.message === "string"
      ? payload.message
      : "Logo 上传失败，请稍后再试";
    throw new Error(message);
  }

  const data = payload as UploadLogoSuccessPayload | null;
  if (!data?.publicUrl) {
    throw new Error("Logo 上传失败，请稍后再试");
  }

  return data;
}
