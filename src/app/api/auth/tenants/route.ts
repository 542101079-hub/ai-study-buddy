import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

import { loadTenantScopedProfile, loadTenantSummary, type TenantSummary } from "@/lib/auth/tenant-context";
import { isTenantMembershipTableMissing } from "@/lib/auth/memberships";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { Database } from "@/db/types";

export async function GET() {
  const supabase = createRouteHandlerClient<Database>({ cookies: () => cookies() });

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
      .from("app_users")
      .select("tenant_id")
      .eq("email", email);

    if (tenantMembershipsError) {
      if (isTenantMembershipTableMissing(tenantMembershipsError)) {
        console.warn("[api/auth/tenants] tenant membership list unavailable", tenantMembershipsError);
      } else {
        throw tenantMembershipsError;
      }
    } else if (Array.isArray(tenantMemberships)) {
      const seen = new Set<string>();

      for (const membership of tenantMemberships) {
        const membershipTenantId = membership?.tenant_id;
        if (!membershipTenantId || seen.has(membershipTenantId)) {
          continue;
        }

        seen.add(membershipTenantId);

        try {
          const summary = await loadTenantSummary(supabaseAdmin, membershipTenantId);
          if (summary) {
            availableTenants.push(summary);
          }
        } catch (summaryError) {
          console.error("[api/auth/tenants] load tenant summary failed", summaryError);
        }
      }
    }
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
