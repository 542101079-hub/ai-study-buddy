import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

import { formatValidationErrors, loginSchema } from "@/lib/auth/validation";
import { loadTenantScopedProfile, loadTenantSummary, type TenantSummary } from "@/lib/auth/tenant-context";
import { isTenantMembershipTableMissing } from "@/lib/auth/memberships";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { Database } from "@/db/types";

export async function POST(request: Request) {
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient<Database>({ cookies: cookieStore });

  let json: unknown;

  try {
    json = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Unable to parse submitted data" },
      { status: 400 },
    );
  }

  const parsed = loginSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Login information is invalid",
        fieldErrors: formatValidationErrors(parsed.error),
      },
      { status: 400 },
    );
  }

  const { email, password, tenantId } = parsed.data;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return NextResponse.json(
      {
        message: "Email or password is incorrect",
        fieldErrors: {
          email: "Email or password is incorrect",
          password: "Email or password is incorrect",
        },
      },
      { status: 401 },
    );
  }

  const { user } = data;

  let profile;
  try {
    profile = await loadTenantScopedProfile(supabaseAdmin, user.id);
  } catch (profileError) {
    console.error("[auth/login] load profile failed", profileError);
    return NextResponse.json(
          { message: "Login failed, please try again later" },
      { status: 500 },
    );
  }

  if (!profile) {
    return NextResponse.json(
      { message: "Profile not found" },
      { status: 404 },
    );
  }

  if (profile.tenant_id !== tenantId) {
    try {
      const { data: membership, error: membershipError } = await supabaseAdmin
        .from("app_users")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("email", email.toLowerCase())
        .maybeSingle();

      if (membershipError) {
        if (isTenantMembershipTableMissing(membershipError)) {
          console.warn("[auth/login] tenant membership support missing", membershipError);
          await supabase.auth.signOut();
          return NextResponse.json(
            {
              message: "This account is not permitted to access the selected tenant",
              fieldErrors: {
                tenantId: "This account is not permitted to access the selected tenant",
              },
            },
            { status: 403 },
          );
        }

        throw membershipError;
      }

      if (!membership) {
        await supabase.auth.signOut();
        return NextResponse.json(
          {
            message: "This account is not permitted to access the selected tenant",
            fieldErrors: { tenantId: "This account is not permitted to access the selected tenant" },
          },
          { status: 403 },
        );
      }

      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update({ tenant_id: tenantId })
        .eq("id", user.id);

      if (updateError) {
        console.error("[auth/login] update tenant failed", updateError);
        return NextResponse.json(
        { message: "Login failed, please try again later" },
          { status: 500 },
        );
      }

      profile = { ...profile, tenant_id: tenantId };
    } catch (error) {
      console.error("[auth/login] tenant membership check failed", error);
      await supabase.auth.signOut();
      return NextResponse.json(
        { message: "Login failed, please try again later" },
        { status: 500 },
      );
    }
  }

  let tenant;
  try {
    tenant = await loadTenantSummary(supabaseAdmin, tenantId);
  } catch (tenantError) {
    console.error("[auth/login] load tenant failed", tenantError);
    return NextResponse.json(
          { message: "Login failed, please try again later" },
      { status: 500 },
    );
  }
  if (!tenant) {
    await supabase.auth.signOut();
    return NextResponse.json(
      {
        message: "The selected tenant no longer exists or has been removed",
        fieldErrors: { tenantId: "The selected tenant no longer exists or has been removed" },
      },
      { status: 404 },
    );
  }
  let availableTenants: TenantSummary[] = [];
  try {
    const { data: tenantMemberships, error: tenantMembershipsError } = await supabaseAdmin
      .from("app_users")
      .select("tenant_id")
      .eq("email", email.toLowerCase());

    if (tenantMembershipsError) {
      if (isTenantMembershipTableMissing(tenantMembershipsError)) {
        console.warn("[auth/login] tenant membership list unavailable", tenantMembershipsError);
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
          console.error("[auth/login] load tenant summary for list failed", summaryError);
        }
      }
    }
  } catch (listError) {
    console.error("[auth/login] load available tenants failed", listError);
  }


  return NextResponse.json(
    {
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
        profile,
        tenant,
      },
      tenants: availableTenants,
    },
    { status: 200 },
  );
}
