import { supabaseAdmin, getServerSession } from "@/lib/supabase/server";
import { loadTenantScopedProfile } from "./tenant-context";

export type ServerAuthContext = {
  userId: string;
  tenantId: string;
  role: "user" | "admin" | "editor" | "viewer";
};

export async function getServerAuthContext(): Promise<ServerAuthContext | null> {
  const session = await getServerSession();

  if (!session?.user) {
    return null;
  }

  const profile = await loadTenantScopedProfile(supabaseAdmin, session.user.id);

  if (!profile) {
    return null;
  }

  return {
    userId: session.user.id,
    tenantId: profile.tenant_id,
    role: profile.role,
  };
}
