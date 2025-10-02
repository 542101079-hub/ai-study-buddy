import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, getServerSession } from "@/lib/supabase/server";
import { canManageUser, canChangeRole } from "@/lib/auth/permissions";

const ALLOWED_ROLES = new Set(["admin", "editor", "user", "viewer"] as const);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const session = await getServerSession();
    
    if (!session) {
      return NextResponse.json({ message: "Authentication required" }, { status: 401 });
    }

    const resolvedParams = await params;
    const memberIdParam = resolvedParams?.memberId;
    const memberId = Array.isArray(memberIdParam) ? memberIdParam[0] : memberIdParam;

    if (!memberId) {
      return NextResponse.json({ message: "Member ID is required" }, { status: 400 });
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

    const body = await request.json();
    const { role, full_name } = body;

    if (role !== undefined && !ALLOWED_ROLES.has(role)) {
      return NextResponse.json({ message: "Invalid role" }, { status: 400 });
    }

    // 获取目标用户信息
    const { data: target } = await supabaseAdmin
      .from("profiles")
      .select("id, role, tenant_id")
      .eq("id", memberId)
      .single();

    if (!target) {
      return NextResponse.json({ message: "Member not found" }, { status: 404 });
    }

    if (target.tenant_id !== profile.tenant_id) {
      return NextResponse.json({ message: "Member not in same tenant" }, { status: 403 });
    }

    // 权限检查
    if (!canManageUser(profile.role, target.role)) {
      return NextResponse.json({ message: "Insufficient permissions to manage this user" }, { status: 403 });
    }

    if (role !== undefined && role !== target.role) {
      if (!canChangeRole(profile.role, target.role, role as any)) {
        return NextResponse.json({ message: "Insufficient permissions to change role" }, { status: 403 });
      }
    }

    const updates: any = {};
    if (role !== undefined) updates.role = role;
    if (full_name !== undefined) updates.full_name = full_name;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ message: "No updates provided" }, { status: 400 });
    }

    // 使用service role更新用户
    const { data: updatedMember, error } = await supabaseAdmin
      .from("profiles")
      .update(updates)
      .eq("id", memberId)
      .select()
      .single();

    if (error) {
      console.error("[api/admin/members] update error:", error);
      return NextResponse.json({ message: "Failed to update member" }, { status: 500 });
    }

    return NextResponse.json({ member: updatedMember });
  } catch (error) {
    console.error("[api/admin/members] PATCH error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const session = await getServerSession();
    
    if (!session) {
      return NextResponse.json({ message: "Authentication required" }, { status: 401 });
    }

    const resolvedParams = await params;
    const memberIdParam = resolvedParams?.memberId;
    const memberId = Array.isArray(memberIdParam) ? memberIdParam[0] : memberIdParam;

    if (!memberId) {
      return NextResponse.json({ message: "Member ID is required" }, { status: 400 });
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

    // 不能删除自己
    if (memberId === session.user.id) {
      return NextResponse.json({ message: "Cannot delete yourself" }, { status: 400 });
    }

    // 获取目标用户信息
    const { data: target } = await supabaseAdmin
      .from("profiles")
      .select("id, role, tenant_id")
      .eq("id", memberId)
      .single();

    if (!target) {
      return NextResponse.json({ message: "Member not found" }, { status: 404 });
    }

    if (target.tenant_id !== profile.tenant_id) {
      return NextResponse.json({ message: "Member not in same tenant" }, { status: 403 });
    }

    // 权限检查
    if (!canManageUser(profile.role, target.role)) {
      return NextResponse.json({ message: "Insufficient permissions to delete this user" }, { status: 403 });
    }

    // 使用service role删除用户
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", memberId);

    if (profileError) {
      console.error("[api/admin/members] delete profile error:", profileError);
      return NextResponse.json({ message: "Failed to delete profile" }, { status: 500 });
    }

    // 删除auth用户
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(memberId);

    if (authError) {
      console.error("[api/admin/members] delete auth user error:", authError);
      // 不返回错误，因为profile已经删除了
    }

    return NextResponse.json({ message: "Member deleted successfully" });
  } catch (error) {
    console.error("[api/admin/members] DELETE error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}