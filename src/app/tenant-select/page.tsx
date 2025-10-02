import { redirect } from "next/navigation";

import { TenantSelector } from "./tenant-selector";
import { loadTenantScopedProfile, loadTenantSummary } from "@/lib/auth/tenant-context";
import { createServerSupabaseClient, getServerSession } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function TenantSelectPage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/signin");
  }

  const supabase = createServerSupabaseClient();
  
  let profile;
  try {
    profile = await loadTenantScopedProfile(supabase, session.user.id);
  } catch (error) {
    console.error("[tenant-select] load profile failed", error);
    redirect("/signup");
  }

  if (!profile) {
    // 用户没有profile，重定向到注册页面
    redirect("/signup");
  }

  if (profile.role !== "admin") {
    redirect("/dashboard");
  }

  const tenant = await loadTenantSummary(supabase, profile.tenant_id);

  return (
    <section className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-8 px-6 py-12 text-white">
      <header className="space-y-3">
        <p className="text-sm text-white/70">选择一个工作区继续</p>
        <h1 className="text-3xl font-semibold">欢迎回来，{profile.full_name ?? profile.username}</h1>
        <p className="text-sm text-white/60">
          你以管理员身份登录，可以在下方选择需要管理的工作区。
        </p>
      </header>
      <TenantSelector tenants={tenant ? [tenant] : []} />
    </section>
  );
}
