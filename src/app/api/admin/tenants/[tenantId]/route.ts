import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, getServerSession } from "@/lib/supabase/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const session = await getServerSession();
    
    if (!session) {
      return NextResponse.json({ message: "Authentication required" }, { status: 401 });
    }

    const resolvedParams = await params;
    const tenantIdParam = resolvedParams?.tenantId;
    const tenantId = Array.isArray(tenantIdParam) ? tenantIdParam[0] : tenantIdParam;

    if (!tenantId) {
      return NextResponse.json({ message: "Tenant ID is required" }, { status: 400 });
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

    // 验证用户只能更新自己的租户
    if (profile.tenant_id !== tenantId) {
      return NextResponse.json({ message: "Can only update own tenant" }, { status: 403 });
    }

    const body = await request.json();
    const { name, tagline, logo_url } = body;

    // 验证必填字段
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ message: "Tenant name is required" }, { status: 400 });
    }

    if (name.length > 120) {
      return NextResponse.json({ message: "Tenant name must be 120 characters or less" }, { status: 400 });
    }

    if (tagline && typeof tagline === 'string' && tagline.length > 160) {
      return NextResponse.json({ message: "Tagline must be 160 characters or less" }, { status: 400 });
    }

    if (logo_url && typeof logo_url === 'string') {
      try {
        new URL(logo_url);
      } catch {
        return NextResponse.json({ message: "Invalid logo URL" }, { status: 400 });
      }
    }

    // 准备更新数据
    const updates: any = {
      name: name.trim(),
      tagline: tagline && typeof tagline === 'string' ? tagline.trim() || null : null,
      logo_url: logo_url && typeof logo_url === 'string' ? logo_url : null,
      updated_at: new Date().toISOString(),
    };

    // 使用service role更新租户信息
    const { data: updatedTenant, error } = await supabaseAdmin
      .from("tenants")
      .update(updates)
      .eq("id", tenantId)
      .select()
      .single();

    if (error) {
      console.error('Update tenant error:', error);
      return NextResponse.json({ message: "Failed to update tenant" }, { status: 500 });
    }

    return NextResponse.json({ 
      message: "Tenant updated successfully",
      tenant: updatedTenant 
    });

  } catch (error) {
    console.error('Update tenant error:', error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
