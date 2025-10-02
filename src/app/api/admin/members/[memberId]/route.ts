
import { NextResponse } from "next/server";

import { withAdminRoute, canManageUser, canChangeRole } from "@/lib/auth/permissions";

const ALLOWED_ROLES = new Set(["admin", "editor", "user", "viewer"] as const);

export const dynamic = "force-dynamic";

export const PATCH = withAdminRoute(
  async (request, { params }: { params: { memberId: string } }, { supabase, profile }) => {
    const memberIdParam = params?.memberId;
    const memberId = Array.isArray(memberIdParam) ? memberIdParam[0] : memberIdParam;

    if (!memberId) {
      return NextResponse.json({ message: "Missing member id" }, { status: 400 });
    }

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
    }

    const { role, fullName } = (payload ?? {}) as {
      role?: string;
      fullName?: string | null;
    };

    const updates: Record<string, unknown> = {};

    if (role !== undefined) {
      if (!ALLOWED_ROLES.has(role as any)) {
        return NextResponse.json({ message: "Unsupported role" }, { status: 400 });
      }
      updates.role = role;
    }

    if (fullName !== undefined) {
      if (fullName === null) {
        updates.full_name = null;
      } else if (typeof fullName === "string") {
        updates.full_name = fullName.trim() || null;
      } else {
        return NextResponse.json({ message: "Full name must be a string" }, { status: 400 });
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ message: "Nothing to update" }, { status: 400 });
    }

    const { data: target, error: fetchError } = await supabase
      .from("profiles")
      .select("id, tenant_id, role, username, full_name, avatar_url")
      .eq("id", memberId)
      .maybeSingle();

    if (fetchError) {
      console.error("[api/admin/members] fetch", fetchError);
      return NextResponse.json({ message: "Failed to load member" }, { status: 500 });
    }

    if (!target || target.tenant_id !== profile.tenant_id) {
      return NextResponse.json({ message: "Member not found" }, { status: 404 });
    }

    // 检查是否有权限管理此用户
    if (!canManageUser(profile.role, target.role)) {
      return NextResponse.json({ message: "Insufficient permissions to manage this user" }, { status: 403 });
    }

    // 如果要更改角色，检查是否有权限
    if (role !== undefined && role !== target.role) {
      if (!canChangeRole(profile.role, target.role, role as any)) {
        return NextResponse.json({ message: "Insufficient permissions to change role" }, { status: 403 });
      }
    }

    const { data: updated, error: updateError } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", memberId)
      .select("id, tenant_id, role, username, full_name, avatar_url")
      .single();

    if (updateError || !updated) {
      console.error("[api/admin/members] update", updateError);
      return NextResponse.json({ message: "Failed to update member" }, { status: 500 });
    }

    return NextResponse.json({ member: updated });
  },
);
