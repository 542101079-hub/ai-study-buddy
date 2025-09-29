import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/db/types";

type ProfilesTable = Database["public"]["Tables"]["profiles"];
type TenantsTable = Database["public"]["Tables"]["tenants"];

export type TenantScopedProfile = Pick<
  ProfilesTable["Row"],
  "id" | "tenant_id" | "role" | "username" | "full_name" | "avatar_url"
>;

export type TenantSummary = Pick<TenantsTable["Row"], "id" | "name" | "slug">;

const PROFILE_COLUMNS = "id, tenant_id, role, username, full_name, avatar_url";
const TENANT_COLUMNS = "id, name, slug";

export async function loadTenantScopedProfile(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<TenantScopedProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", userId)
    .maybeSingle<TenantScopedProfile>();

  if (error) {
    throw error;
  }

  return data ?? null;
}

export async function loadTenantSummary(
  supabase: SupabaseClient<Database>,
  tenantId: string,
): Promise<TenantSummary | null> {
  const { data, error } = await supabase
    .from("tenants")
    .select(TENANT_COLUMNS)
    .eq("id", tenantId)
    .maybeSingle<TenantSummary>();

  if (error) {
    throw error;
  }

  return data ?? null;
}

export type TenantAccessCheck =
  | { allowed: true; profile: TenantScopedProfile }
  | { allowed: false; reason: "profile-not-found" | "tenant-mismatch" };

export async function ensureTenantMembership(
  supabase: SupabaseClient<Database>,
  userId: string,
  tenantId: string,
): Promise<TenantAccessCheck> {
  const profile = await loadTenantScopedProfile(supabase, userId);

  if (!profile) {
    return { allowed: false, reason: "profile-not-found" };
  }

  if (profile.tenant_id !== tenantId) {
    return { allowed: false, reason: "tenant-mismatch" };
  }

  return { allowed: true, profile };
}
