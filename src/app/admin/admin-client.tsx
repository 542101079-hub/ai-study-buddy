"use client";

import { useState } from "react";
import { MemberManager } from "./member-manager";
import { TenantSettings } from "./tenant-settings";
import { UserRole } from "@/lib/auth/permissions";

type TenantInfo = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  tagline: string | null;
};

type Member = {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
};

type Props = {
  initialTenant: TenantInfo | null;
  initialMembers: Member[];
  currentUserId: string;
  currentUserRole: UserRole;
};

export function AdminClient({ 
  initialTenant, 
  initialMembers, 
  currentUserId, 
  currentUserRole 
}: Props) {
  const [tenant, setTenant] = useState(initialTenant);

  const handleTenantUpdate = (updatedTenant: TenantInfo) => {
    setTenant(updatedTenant);
  };

  return (
    <div className="space-y-6">
      {/* 租户设置 */}
      {tenant && (
        <TenantSettings 
          tenant={tenant}
          onUpdate={handleTenantUpdate}
        />
      )}

      {/* 用户权限管理 */}
      <div className="rounded-xl border border-white/10 bg-slate-900/60 p-6 shadow-lg backdrop-blur">
        <h2 className="text-lg font-medium text-white">用户权限管理</h2>
        <p className="mt-1 text-xs text-white/60">
          管理租户内用户的角色和权限。不同角色拥有不同的系统访问权限。
        </p>
        <div className="mt-4">
          <MemberManager 
            initialMembers={initialMembers} 
            currentUserId={currentUserId} 
            currentUserRole={currentUserRole}
          />
        </div>
      </div>

      {/* 角色权限说明 */}
      <div className="rounded-xl border border-white/10 bg-slate-900/60 p-6 shadow-lg backdrop-blur">
        <h2 className="text-lg font-medium text-white">角色权限说明</h2>
        <p className="mt-1 text-xs text-white/60 mb-4">
          了解不同角色的权限范围和功能限制。
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          {(['admin', 'editor', 'user', 'viewer'] as const).map((role) => (
            <div key={role} className="rounded-lg border border-white/5 bg-slate-800/40 p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                  role === 'admin' ? 'bg-red-500/20 text-red-300' :
                  role === 'editor' ? 'bg-blue-500/20 text-blue-300' :
                  role === 'user' ? 'bg-green-500/20 text-green-300' :
                  'bg-gray-500/20 text-gray-300'
                }`}>
                  {role === 'admin' ? '管理员' : 
                   role === 'editor' ? '编辑者' :
                   role === 'user' ? '普通用户' : '查看者'}
                </span>
              </div>
              <p className="text-xs text-white/70">
                {role === 'admin' ? '拥有所有权限，可以管理用户、内容和系统设置' :
                 role === 'editor' ? '可以管理内容，查看用户信息和分析数据' :
                 role === 'user' ? '可以创建和管理自己的内容，使用基本功能' :
                 '只能查看内容，无法进行编辑操作'}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
