import { NextResponse } from "next/server";

import { buildStoredLogoFileName, logoStorageConfig, validateLogoPayload } from "@/lib/storage/logo";
import { supabaseAdmin } from "@/lib/supabase/server";

const DEFAULT_ERROR_MESSAGE = "Logo 上传失败，请稍后再试";

export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (error) {
    console.error("[storage/upload-tenant-logo] formData parse failed", error);
    return NextResponse.json({ message: DEFAULT_ERROR_MESSAGE }, { status: 400 });
  }

  const file = formData.get("file");
  if (!file || typeof (file as Blob).arrayBuffer !== "function") {
    return NextResponse.json({ message: "未收到有效的 Logo 文件" }, { status: 400 });
  }

  const blob = file as Blob;
  const tenantName = (formData.get("tenantName") as string | null) ?? null;
  const originalFileName = (formData.get("originalFileName") as string | null) ?? null;
  const reportedMimeType = (formData.get("mimeType") as string | null) ?? null;
  const mimeType = reportedMimeType || ("type" in blob ? blob.type : null) || null;

  const validationError = validateLogoPayload({
    size: "size" in blob ? blob.size : 0,
    mimeType,
    originalFileName,
  });

  if (validationError) {
    return NextResponse.json({ message: validationError }, { status: 400 });
  }

  const { storedFileName } = buildStoredLogoFileName({
    tenantName,
    originalFileName,
    mimeType,
  });

  let uploadResult;
  try {
    const arrayBuffer = await blob.arrayBuffer();
    uploadResult = await supabaseAdmin.storage
      .from(logoStorageConfig.bucket)
      .upload(storedFileName, arrayBuffer, {
        cacheControl: "3600",
        contentType: mimeType ?? undefined,
        upsert: false,
      });
  } catch (error) {
    console.error("[storage/upload-tenant-logo] upload threw", error);
    return NextResponse.json({ message: DEFAULT_ERROR_MESSAGE }, { status: 500 });
  }

  if (uploadResult.error || !uploadResult.data) {
    console.error("[storage/upload-tenant-logo] upload failed", uploadResult.error);
    return NextResponse.json({ message: DEFAULT_ERROR_MESSAGE }, { status: 500 });
  }

  const { data: publicUrlData, error: publicUrlError } = supabaseAdmin.storage
    .from(logoStorageConfig.bucket)
    .getPublicUrl(uploadResult.data.path);

  if (publicUrlError || !publicUrlData?.publicUrl) {
    console.error("[storage/upload-tenant-logo] getPublicUrl failed", publicUrlError);
    return NextResponse.json({ message: DEFAULT_ERROR_MESSAGE }, { status: 500 });
  }

  return NextResponse.json(
    {
      publicUrl: publicUrlData.publicUrl,
      storagePath: uploadResult.data.path,
      storedFileName,
    },
    { status: 201 },
  );
}
