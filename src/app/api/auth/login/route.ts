import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

import { formatValidationErrors, loginSchema } from "@/lib/auth/validation";
import { loadTenantScopedProfile, loadTenantSummary, type TenantSummary } from "@/lib/auth/tenant-context";
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
        .from("users")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("email", email.toLowerCase())
        .maybeSingle();

      if (membershipError) {
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
      .from("users")
      .select("tenant_id, tenants:tenant_id (id, name, slug, logo_url, tagline)")
      .eq("email", email.toLowerCase());

    if (tenantMembershipsError) {
      throw tenantMembershipsError;
    }

    const mappedTenants = Array.isArray(tenantMemberships)
      ? tenantMemberships
          .map((membership) => membership.tenants)
          .filter((value): value is TenantSummary => Boolean(value))
      : [];

    const seen = new Set<string>();
    availableTenants = mappedTenants.filter((item) => {
      if (seen.has(item.id)) {
        return false;
      }
      seen.add(item.id);
      return true;
    });
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
