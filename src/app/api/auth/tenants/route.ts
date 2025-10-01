import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

import { loadTenantScopedProfile, loadTenantSummary, type TenantSummary } from "@/lib/auth/tenant-context";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { Database } from "@/db/types";

export async function GET() {
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient<Database>({ cookies: cookieStore });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session || !session.user.email) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const email = session.user.email.toLowerCase();

  let availableTenants: TenantSummary[] = [];

  try {
    const { data: tenantMemberships, error: tenantMembershipsError } = await supabaseAdmin
      .from("users")
      .select("tenant_id, tenants:tenant_id (id, name, slug, logo_url, tagline)")
      .eq("email", email);

    if (tenantMembershipsError) {
      throw tenantMembershipsError;
    }

    const mappedTenants = Array.isArray(tenantMemberships)
      ? tenantMemberships
          .map((membership) => membership.tenants)
          .filter((value): value is TenantSummary => Boolean(value))
      : [];

    const seen = new Set<string>();
    availableTenants = mappedTenants.filter((tenant) => {
      if (seen.has(tenant.id)) {
        return false;
      }
      seen.add(tenant.id);
      return true;
    });
  } catch (error) {
    console.error("[api/auth/tenants] load memberships failed", error);
  }

  try {
    const profile = await loadTenantScopedProfile(supabaseAdmin, session.user.id);
    if (profile?.tenant_id && !availableTenants.some((tenant) => tenant.id === profile.tenant_id)) {
      const activeTenant = await loadTenantSummary(supabaseAdmin, profile.tenant_id);
      if (activeTenant) {
        availableTenants.unshift(activeTenant);
      }
    }
  } catch (error) {
    console.error("[api/auth/tenants] load active tenant failed", error);
  }

  return NextResponse.json({ tenants: availableTenants }, { status: 200 });
}
