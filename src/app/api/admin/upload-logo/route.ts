import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, getServerSession } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session) {
      return NextResponse.json({ message: "Authentication required" }, { status: 401 });
    }

    // 使用service role获取当前用户profile
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, role, tenant_id")
      .eq("id", session.user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ message: "Admin access required" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const tenantId = formData.get('tenantId') as string;

    if (!file) {
      return NextResponse.json({ message: "No file provided" }, { status: 400 });
    }

    if (!tenantId || tenantId !== profile.tenant_id) {
      return NextResponse.json({ message: "Invalid tenant" }, { status: 403 });
    }

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ message: "Only image files are allowed" }, { status: 400 });
    }

    // 验证文件大小 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ message: "File size must be less than 5MB" }, { status: 400 });
    }

    // 生成唯一文件名
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const fileName = `tenant-logos/${tenantId}/${Date.now()}.${fileExtension}`;

    // 将文件转换为ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // 上传到Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('public')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ message: "Upload failed" }, { status: 500 });
    }

    // 获取公开URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('public')
      .getPublicUrl(fileName);

    return NextResponse.json({ 
      url: publicUrl,
      path: fileName 
    });

  } catch (error) {
    console.error('Upload logo error:', error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
