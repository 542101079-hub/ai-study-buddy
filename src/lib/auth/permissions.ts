/**
 * 权限管理系统
 * 定义不同角色的权限和访问控制
 */

export type UserRole = "user" | "admin" | "editor" | "viewer";

export interface Permission {
  // 用户管理权限
  canViewUsers: boolean;
  canEditUsers: boolean;
  canDeleteUsers: boolean;
  canChangeUserRoles: boolean;
  canInviteUsers: boolean;
  
  // 内容管理权限
  canCreateContent: boolean;
  canEditContent: boolean;
  canDeleteContent: boolean;
  canPublishContent: boolean;
  
  // 系统管理权限
  canManageTenant: boolean;
  canViewAnalytics: boolean;
  canManageSettings: boolean;
  
  // 学习功能权限
  canAccessAdvancedFeatures: boolean;
  canExportData: boolean;
}

/**
 * 角色权限映射
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission> = {
  admin: {
    // 管理员拥有所有权限
    canViewUsers: true,
    canEditUsers: true,
    canDeleteUsers: true,
    canChangeUserRoles: true,
    canInviteUsers: true,
    canCreateContent: true,
    canEditContent: true,
    canDeleteContent: true,
    canPublishContent: true,
    canManageTenant: true,
    canViewAnalytics: true,
    canManageSettings: true,
    canAccessAdvancedFeatures: true,
    canExportData: true,
  },
  
  editor: {
    // 编辑者可以管理内容和查看用户
    canViewUsers: true,
    canEditUsers: false,
    canDeleteUsers: false,
    canChangeUserRoles: false,
    canInviteUsers: false,
    canCreateContent: true,
    canEditContent: true,
    canDeleteContent: true,
    canPublishContent: true,
    canManageTenant: false,
    canViewAnalytics: true,
    canManageSettings: false,
    canAccessAdvancedFeatures: true,
    canExportData: true,
  },
  
  user: {
    // 普通用户基本权限
    canViewUsers: false,
    canEditUsers: false,
    canDeleteUsers: false,
    canChangeUserRoles: false,
    canInviteUsers: false,
    canCreateContent: true,
    canEditContent: false, // 只能编辑自己的内容
    canDeleteContent: false, // 只能删除自己的内容
    canPublishContent: false,
    canManageTenant: false,
    canViewAnalytics: false,
    canManageSettings: false,
    canAccessAdvancedFeatures: false,
    canExportData: false,
  },
  
  viewer: {
    // 查看者只有只读权限
    canViewUsers: false,
    canEditUsers: false,
    canDeleteUsers: false,
    canChangeUserRoles: false,
    canInviteUsers: false,
    canCreateContent: false,
    canEditContent: false,
    canDeleteContent: false,
    canPublishContent: false,
    canManageTenant: false,
    canViewAnalytics: false,
    canManageSettings: false,
    canAccessAdvancedFeatures: false,
    canExportData: false,
  },
};

/**
 * 获取用户权限
 */
export function getUserPermissions(role: UserRole): Permission {
  return ROLE_PERMISSIONS[role];
}

/**
 * 检查用户是否有特定权限
 */
export function hasPermission(role: UserRole, permission: keyof Permission): boolean {
  return ROLE_PERMISSIONS[role][permission];
}

/**
 * 检查用户是否可以管理其他用户
 */
export function canManageUser(currentUserRole: UserRole, targetUserRole: UserRole): boolean {
  const permissions = getUserPermissions(currentUserRole);
  
  // 只有管理员可以管理其他用户
  if (!permissions.canEditUsers) {
    return false;
  }
  
  // 管理员可以管理所有角色
  if (currentUserRole === "admin") {
    return true;
  }
  
  return false;
}

/**
 * 检查用户是否可以更改角色
 */
export function canChangeRole(
  currentUserRole: UserRole, 
  fromRole: UserRole, 
  toRole: UserRole
): boolean {
  const permissions = getUserPermissions(currentUserRole);
  
  // 必须有更改角色的权限
  if (!permissions.canChangeUserRoles) {
    return false;
  }
  
  // 管理员可以更改任何角色
  if (currentUserRole === "admin") {
    return true;
  }
  
  return false;
}

/**
 * 获取角色显示名称
 */
export function getRoleDisplayName(role: UserRole): string {
  const roleNames: Record<UserRole, string> = {
    admin: "管理员",
    editor: "编辑者", 
    user: "普通用户",
    viewer: "查看者",
  };
  
  return roleNames[role];
}

/**
 * 获取角色描述
 */
export function getRoleDescription(role: UserRole): string {
  const descriptions: Record<UserRole, string> = {
    admin: "拥有所有权限，可以管理用户、内容和系统设置",
    editor: "可以管理内容，查看用户信息和分析数据",
    user: "可以创建和管理自己的内容，使用基本功能",
    viewer: "只能查看内容，无法进行编辑操作",
  };
  
  return descriptions[role];
}

/**
 * 获取可分配的角色列表（基于当前用户权限）
 */
export function getAssignableRoles(currentUserRole: UserRole): UserRole[] {
  if (currentUserRole === "admin") {
    return ["admin", "editor", "user", "viewer"];
  }
  
  // 其他角色不能分配角色
  return [];
}

/**
 * 管理员路由守卫
 * 用于保护需要管理员权限的API路由
 */
import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { loadTenantScopedProfile } from "./tenant-context";
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