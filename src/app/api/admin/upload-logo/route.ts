import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { withAdminRoute } from "@/lib/auth/server-guards";

export const POST = withAdminRoute(async (request: NextRequest, _context, { profile }) => {
  try {
    if (profile.role !== "admin") {
      return NextResponse.json({ message: "Admin access required" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const tenantId = formData.get("tenantId") as string | null;

    if (!file) {
      return NextResponse.json({ message: "No file provided" }, { status: 400 });
    }

    if (!tenantId || tenantId !== profile.tenant_id) {
      return NextResponse.json({ message: "Invalid tenant" }, { status: 403 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ message: "Only image files are allowed" }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ message: "File size must be less than 5MB" }, { status: 400 });
    }

    const fileExtension = file.name.split(".").pop() || "jpg";
    const fileName = `tenant-logos/${tenantId}/${Date.now()}.${fileExtension}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await supabaseAdmin.storage
      .from("public")
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json({ message: "Upload failed" }, { status: 500 });
    }

    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from("public").getPublicUrl(fileName);

    return NextResponse.json({
      url: publicUrl,
      path: fileName,
    });
  } catch (error) {
    console.error("Upload logo error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
});
