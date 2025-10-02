
import { redirect } from "next/navigation";

import { MemberManager } from "./member-manager";
import { loadTenantScopedProfile, loadTenantSummary } from "@/lib/auth/tenant-context";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/");
  }

  const profile = await loadTenantScopedProfile(supabase, session.user.id);

  if (!profile || profile.role !== "admin") {
    redirect("/dashboard");
  }

  const tenant = await loadTenantSummary(supabase, profile.tenant_id);
  const { data: members } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url, role")
    .eq("tenant_id", profile.tenant_id)
    .order("username", { nulls: "last" });

  return (
    <section className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-white">Workspace administration</h1>
        <p className="text-sm text-white/70">
          {tenant ? `${tenant.name} (${tenant.slug})` : "Current workspace"}
        </p>
        <p className="text-xs text-white/50">
          Only administrators can access this page and manage members inside the same tenant.
        </p>
      </header>
      <div className="space-y-6">
        <div className="rounded-xl border border-white/10 bg-slate-900/60 p-6 shadow-lg backdrop-blur">
          <h2 className="text-lg font-medium text-white">用户权限管理</h2>
          <p className="mt-1 text-xs text-white/60">
            管理租户内用户的角色和权限。不同角色拥有不同的系统访问权限。
          </p>
          <div className="mt-4">
            <MemberManager 
              initialMembers={members ?? []} 
              currentUserId={profile.id} 
              currentUserRole={profile.role}
            />
          </div>
        </div>

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
    </section>
  );
}
