/**
 * 权限检查中间件
 * 用于保护需要特定权限的页面和API路由
 */

import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { loadTenantScopedProfile } from "./tenant-context";
import { getUserPermissions, type UserRole, type Permission } from "./permissions";
import type { Database } from "@/db/types";

/**
 * 权限检查选项
 */
interface PermissionCheckOptions {
  // 需要的权限列表
  requiredPermissions?: (keyof Permission)[];
  // 允许的角色列表
  allowedRoles?: UserRole[];
  // 是否允许用户访问自己的资源
  allowSelf?: boolean;
  // 自定义权限检查函数
  customCheck?: (profile: any, context: any) => boolean;
}

/**
 * 创建权限检查中间件
 */
export function withPermissions(options: PermissionCheckOptions = {}) {
  return function <T extends any[]>(
    handler: (request: NextRequest, ...args: T) => Promise<NextResponse>
  ) {
    return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
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

        // 检查角色权限
        if (options.allowedRoles && !options.allowedRoles.includes(profile.role)) {
          return NextResponse.json(
            { message: "Insufficient role permissions" },
            { status: 403 }
          );
        }

        // 检查具体权限
        if (options.requiredPermissions) {
          const userPermissions = getUserPermissions(profile.role);
          
          for (const permission of options.requiredPermissions) {
            if (!userPermissions[permission]) {
              return NextResponse.json(
                { message: `Missing permission: ${permission}` },
                { status: 403 }
              );
            }
          }
        }

        // 自定义权限检查
        if (options.customCheck) {
          const context = { supabase, profile, session };
          if (!options.customCheck(profile, context)) {
            return NextResponse.json(
              { message: "Custom permission check failed" },
              { status: 403 }
            );
          }
        }

        // 权限检查通过，调用原始处理函数
        return await handler(request, ...args);
        
      } catch (error) {
        console.error("[withPermissions] error:", error);
        return NextResponse.json(
          { message: "Internal server error" },
          { status: 500 }
        );
      }
    };
  };
}

/**
 * 管理员权限检查（简化版）
 */
export const withAdminPermissions = withPermissions({
  allowedRoles: ["admin"],
});

/**
 * 编辑者权限检查
 */
export const withEditorPermissions = withPermissions({
  allowedRoles: ["admin", "editor"],
});

/**
 * 用户管理权限检查
 */
export const withUserManagementPermissions = withPermissions({
  requiredPermissions: ["canViewUsers"],
});

/**
 * 内容管理权限检查
 */
export const withContentManagementPermissions = withPermissions({
  requiredPermissions: ["canCreateContent", "canEditContent"],
});

/**
 * 检查用户是否可以访问特定资源
 */
export async function checkResourceAccess(
  userId: string,
  resourceOwnerId: string,
  requiredPermission?: keyof Permission
): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    // 如果是访问自己的资源，通常允许
    if (userId === resourceOwnerId) {
      return { allowed: true };
    }

    // 加载用户profile
    const profile = await loadTenantScopedProfile(supabase, userId);
    
    if (!profile) {
      return { allowed: false, reason: "Profile not found" };
    }

    // 检查是否有特定权限
    if (requiredPermission) {
      const permissions = getUserPermissions(profile.role);
      if (!permissions[requiredPermission]) {
        return { allowed: false, reason: `Missing permission: ${requiredPermission}` };
      }
    }

    return { allowed: true };
    
  } catch (error) {
    console.error("[checkResourceAccess] error:", error);
    return { allowed: false, reason: "Internal error" };
  }
}
