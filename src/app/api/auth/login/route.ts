import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

import { formatValidationErrors, loginSchema } from "@/lib/auth/validation";
import { loadTenantScopedProfile, loadTenantSummary, type TenantSummary } from "@/lib/auth/tenant-context";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { Database } from "@/db/types";

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });

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
        {
          message: "Login failed, please try again later",
          detail: profileError instanceof Error ? profileError.message : String(profileError),
        },
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
    const availableTenants: TenantSummary[] = [tenant];

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
  } catch (error) {
    console.error("[auth/login] unexpected", error);
    return NextResponse.json(
      {
        message: "Login failed, please try again later",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
