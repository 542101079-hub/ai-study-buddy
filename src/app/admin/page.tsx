
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
      <div className="rounded-xl border border-white/10 bg-slate-900/60 p-6 shadow-lg backdrop-blur">
        <h2 className="text-lg font-medium text-white">Member permissions</h2>
        <p className="mt-1 text-xs text-white/60">
          Update display names or switch between administrator and member roles.
        </p>
        <div className="mt-4">
          <MemberManager initialMembers={members ?? []} currentUserId={profile.id} />
        </div>
      </div>
    </section>
  );
}
