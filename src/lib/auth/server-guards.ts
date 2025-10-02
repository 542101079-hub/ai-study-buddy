/**
 * 服务端路由守卫
 * 用于保护需要特定权限的API路由
 */

import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { loadTenantScopedProfile } from "./tenant-context";
import { getUserPermissions, type UserRole } from "./permissions";
import type { Database } from "@/db/types";

type AdminRouteHandler<T = any> = (
  request: NextRequest,
  context: T,
  auth: {
    supabase: ReturnType<typeof createRouteHandlerClient<Database>>;
    profile: {
      id: string;
      tenant_id: string;
      role: UserRole;
      username: string;
      full_name: string | null;
      avatar_url: string | null;
    };
  }
) => Promise<NextResponse>;

/**
 * 管理员路由守卫
 * 用于保护需要管理员权限的API路由
 */
export function withAdminRoute<T = any>(handler: AdminRouteHandler<T>) {
  return async (request: NextRequest, context: T) => {
    try {
      const supabase = createRouteHandlerClient<Database>({ cookies });
      
      // 检查用户是否已登录
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        return NextResponse.json(
          { message: "Authentication required" },
          { status: 401 }
        );
      }

      // 加载用户profile
      const profile = await loadTenantScopedProfile(supabase, session.user.id);
      
      if (!profile) {
        return NextResponse.json(
          { message: "Profile not found" },
          { status: 404 }
        );
      }

      // 检查是否有管理员权限
      const permissions = getUserPermissions(profile.role);
      if (!permissions.canViewUsers) {
        return NextResponse.json(
          { message: "Insufficient permissions" },
          { status: 403 }
        );
      }

      // 调用实际的处理函数
      return await handler(request, context, { supabase, profile });
      
    } catch (error) {
      console.error("[withAdminRoute] error:", error);
      return NextResponse.json(
        { message: "Internal server error" },
        { status: 500 }
      );
    }
  };
}
