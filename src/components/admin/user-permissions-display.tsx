"use client";

import { getUserPermissions, getRoleDisplayName, type UserRole } from "@/lib/auth/permissions";

interface UserPermissionsDisplayProps {
  role: UserRole;
  compact?: boolean;
}

export function UserPermissionsDisplay({ role, compact = false }: UserPermissionsDisplayProps) {
  const permissions = getUserPermissions(role);
  
  const permissionGroups = [
    {
      title: "用户管理",
      permissions: [
        { key: "canViewUsers", label: "查看用户", enabled: permissions.canViewUsers },
        { key: "canEditUsers", label: "编辑用户", enabled: permissions.canEditUsers },
        { key: "canDeleteUsers", label: "删除用户", enabled: permissions.canDeleteUsers },
        { key: "canChangeUserRoles", label: "更改角色", enabled: permissions.canChangeUserRoles },
        { key: "canInviteUsers", label: "邀请用户", enabled: permissions.canInviteUsers },
      ]
    },
    {
      title: "内容管理",
      permissions: [
        { key: "canCreateContent", label: "创建内容", enabled: permissions.canCreateContent },
        { key: "canEditContent", label: "编辑内容", enabled: permissions.canEditContent },
        { key: "canDeleteContent", label: "删除内容", enabled: permissions.canDeleteContent },
        { key: "canPublishContent", label: "发布内容", enabled: permissions.canPublishContent },
      ]
    },
    {
      title: "系统管理",
      permissions: [
        { key: "canManageTenant", label: "管理租户", enabled: permissions.canManageTenant },
        { key: "canViewAnalytics", label: "查看分析", enabled: permissions.canViewAnalytics },
        { key: "canManageSettings", label: "管理设置", enabled: permissions.canManageSettings },
      ]
    },
    {
      title: "高级功能",
      permissions: [
        { key: "canAccessAdvancedFeatures", label: "高级功能", enabled: permissions.canAccessAdvancedFeatures },
        { key: "canExportData", label: "导出数据", enabled: permissions.canExportData },
      ]
    }
  ];

  if (compact) {
    const enabledCount = Object.values(permissions).filter(Boolean).length;
    const totalCount = Object.values(permissions).length;
    
    return (
      <div className="text-xs text-white/60">
        {getRoleDisplayName(role)} ({enabledCount}/{totalCount} 权限)
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold text-white">
          {getRoleDisplayName(role)} 权限
        </h3>
        <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
          role === 'admin' ? 'bg-red-500/20 text-red-300' :
          role === 'editor' ? 'bg-blue-500/20 text-blue-300' :
          role === 'user' ? 'bg-green-500/20 text-green-300' :
          'bg-gray-500/20 text-gray-300'
        }`}>
          {role}
        </span>
      </div>
      
      <div className="grid gap-4 sm:grid-cols-2">
        {permissionGroups.map((group) => (
          <div key={group.title} className="rounded-lg border border-white/10 bg-slate-900/40 p-3">
            <h4 className="text-sm font-medium text-white mb-2">{group.title}</h4>
            <div className="space-y-1">
              {group.permissions.map((permission) => (
                <div key={permission.key} className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    permission.enabled ? 'bg-green-400' : 'bg-gray-500'
                  }`} />
                  <span className={`text-xs ${
                    permission.enabled ? 'text-white/90' : 'text-white/50'
                  }`}>
                    {permission.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * 权限对比组件
 * 用于显示角色变更前后的权限差异
 */
interface PermissionComparisonProps {
  fromRole: UserRole;
  toRole: UserRole;
}

export function PermissionComparison({ fromRole, toRole }: PermissionComparisonProps) {
  const fromPermissions = getUserPermissions(fromRole);
  const toPermissions = getUserPermissions(toRole);
  
  const allPermissionKeys = Object.keys(fromPermissions) as (keyof typeof fromPermissions)[];
  
  const changes = allPermissionKeys.map(key => ({
    key,
    label: getPermissionLabel(key),
    from: fromPermissions[key],
    to: toPermissions[key],
    changed: fromPermissions[key] !== toPermissions[key]
  })).filter(change => change.changed);

  if (changes.length === 0) {
    return (
      <div className="text-sm text-white/60">
        权限无变化
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-white">权限变更预览</h4>
      <div className="space-y-1">
        {changes.map((change) => (
          <div key={change.key} className="flex items-center gap-2 text-xs">
            <span className="text-white/70">{change.label}:</span>
            <span className={change.from ? 'text-green-400' : 'text-red-400'}>
              {change.from ? '✓' : '✗'}
            </span>
            <span className="text-white/50">→</span>
            <span className={change.to ? 'text-green-400' : 'text-red-400'}>
              {change.to ? '✓' : '✗'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function getPermissionLabel(key: string): string {
  const labels: Record<string, string> = {
    canViewUsers: "查看用户",
    canEditUsers: "编辑用户", 
    canDeleteUsers: "删除用户",
    canChangeUserRoles: "更改角色",
    canInviteUsers: "邀请用户",
    canCreateContent: "创建内容",
    canEditContent: "编辑内容",
    canDeleteContent: "删除内容",
    canPublishContent: "发布内容",
    canManageTenant: "管理租户",
    canViewAnalytics: "查看分析",
    canManageSettings: "管理设置",
    canAccessAdvancedFeatures: "高级功能",
    canExportData: "导出数据",
  };
  
  return labels[key] || key;
}
