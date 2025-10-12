"use client";

import { useState } from "react";

import { MemberManager } from "./member-manager";
import { TenantSettings } from "./tenant-settings";
import { UserRole } from "@/lib/auth/permissions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  aiCard,
  aiMutedText,
  aiSubCard,
} from "@/components/ui/ai-surface";

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

const ROLE_META: Record<UserRole, { label: string; description: string; gradient: string }> = {
  admin: {
    label: "管理员",
    description: "拥有全部权限，可以管理成员、内容与空间设置。",
    gradient: "from-rose-500/30 via-rose-500/20 to-amber-400/20",
  },
  editor: {
    label: "编辑者",
    description: "可以创作与维护内容，查看成员信息，但无法修改权限。",
    gradient: "from-sky-500/30 via-indigo-500/20 to-violet-500/20",
  },
  user: {
    label: "成员",
    description: "可以查看与参与空间内容，管理个人资料。",
    gradient: "from-emerald-500/30 via-teal-500/20 to-sky-400/20",
  },
  viewer: {
    label: "访客",
    description: "仅可浏览内容，无法进行编辑或管理操作。",
    gradient: "from-slate-500/30 via-slate-500/20 to-zinc-500/20",
  },
};

export function AdminClient({
  initialTenant,
  initialMembers,
  currentUserId,
  currentUserRole,
}: Props) {
  const [tenant, setTenant] = useState(initialTenant);

  const handleTenantUpdate = (updatedTenant: TenantInfo) => {
    setTenant(updatedTenant);
  };

  return (
    <div className="space-y-6 text-slate-100">
      {tenant && <TenantSettings tenant={tenant} onUpdate={handleTenantUpdate} />}

      <Card className={`${aiCard} p-6`}>
        <CardHeader className="space-y-2 p-0 pb-4">
          <CardTitle className="text-xl text-white">成员与权限</CardTitle>
          <CardDescription className={`text-sm ${aiMutedText}`}>
            管理空间成员的角色与权限，保持团队协作安全有序。
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <MemberManager
            initialMembers={initialMembers}
            currentUserId={currentUserId}
            currentUserRole={currentUserRole}
          />
        </CardContent>
      </Card>

      <Card className={`${aiCard} p-6`}>
        <CardHeader className="space-y-2 p-0 pb-4">
          <CardTitle className="text-xl text-white">角色权限说明</CardTitle>
          <CardDescription className={`text-sm ${aiMutedText}`}>
            了解不同角色可执行的操作，便于为成员分配合适职责。
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 p-0 md:grid-cols-2">
          {(Object.keys(ROLE_META) as UserRole[]).map((role) => {
            const meta = ROLE_META[role];
            return (
              <Card
                key={role}
                className={`${aiSubCard} h-full border border-white/10 bg-gradient-to-br ${meta.gradient} text-white shadow-inner`}
              >
                <CardHeader className="space-y-1">
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold text-white">
                    {meta.label}
                    <span className="text-xs uppercase tracking-wide text-white/70">{role}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-white/85">
                  <p>{meta.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
