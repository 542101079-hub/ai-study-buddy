
import { redirect } from "next/navigation";

import { AdminClient } from "./admin-client";
import { loadTenantScopedProfile, loadTenantSummary } from "@/lib/auth/tenant-context";
import { createServerSupabaseClient, supabaseAdmin, getServerSession } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/");
  }

  // 使用service role绕过RLS问题获取profile
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, username, full_name, avatar_url, role, tenant_id")
    .eq("id", session.user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    redirect("/dashboard");
  }

  // 使用service role获取租户信息和成员列表
  const { data: tenant } = await supabaseAdmin
    .from("tenants")
    .select("id, name, slug")
    .eq("id", profile.tenant_id)
    .single();

  const { data: members } = await supabaseAdmin
    .from("profiles")
    .select("id, username, full_name, avatar_url, role")
    .eq("tenant_id", profile.tenant_id)
    .order("username", { nullsFirst: false });

  return (
    <section className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-white">工作空间管理</h1>
        <p className="text-sm text-white/70">
          {tenant ? `${tenant.name} (${tenant.slug})` : "当前工作空间"}
        </p>
        <p className="text-xs text-white/50">
          只有管理员可以访问此页面并管理同一租户内的成员。
        </p>
        
        <div className="pt-4">
          <a 
            href="/admin/database"
            className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm transition-colors"
          >
            🛠️ 数据库管理工具
          </a>
        </div>
      </header>
      <AdminClient
        initialTenant={tenant}
        initialMembers={members ?? []}
        currentUserId={profile.id}
        currentUserRole={profile.role}
      />
    </section>
  );
}
