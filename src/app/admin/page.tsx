import { redirect } from "next/navigation";

import { AdminClient } from "./admin-client";
import { supabaseAdmin, getServerSession } from "@/lib/supabase/server";
import { aiMutedText, aiPageBg } from "@/components/ui/ai-surface";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/");
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, username, full_name, avatar_url, role, tenant_id")
    .eq("id", session.user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    redirect("/dashboard");
  }

  const { data: tenant } = await supabaseAdmin
    .from("tenants")
    .select("id, name, slug, logo_url, tagline")
    .eq("id", profile.tenant_id)
    .single();

  const { data: members } = await supabaseAdmin
    .from("profiles")
    .select("id, username, full_name, avatar_url, role")
    .eq("tenant_id", profile.tenant_id)
    .order("username", { nullsFirst: false });

  return (
    <div className={aiPageBg}>
      <section className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-12 text-slate-100">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold text-white">空间管理</h1>
          <p className={`text-sm ${aiMutedText}`}>
            {tenant ? `${tenant.name}（${tenant.slug}）` : "当前空间"}
          </p>
          <p className={`text-xs ${aiMutedText}`}>
            只有管理员可以访问此页面并管理同一租户内的成员。
          </p>
        </header>
        <AdminClient
          initialTenant={tenant}
          initialMembers={members ?? []}
          currentUserId={profile.id}
          currentUserRole={profile.role}
        />
      </section>
    </div>
  );
}
