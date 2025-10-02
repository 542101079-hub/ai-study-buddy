import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

import { loadTenantSummary } from "@/lib/auth/tenant-context";
import { isTenantMembershipTableMissing } from "@/lib/auth/memberships";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { Database } from "@/db/types";

export async function POST(request: Request) {
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient<Database>({ cookies: cookieStore });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session || !session.user.email) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Unable to parse submitted data" }, { status: 400 });
  }

  const tenantId = typeof body === "object" && body && "tenantId" in body ? String((body as Record<string, unknown>).tenantId ?? "").trim() : "";

  if (!tenantId) {
    return NextResponse.json({ message: "Tenant id is required" }, { status: 400 });
  }

  const email = session.user.email.toLowerCase();

  try {
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from("app_users")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("email", email)
      .maybeSingle();

    if (membershipError) {
      if (isTenantMembershipTableMissing(membershipError)) {
        console.warn("[api/auth/tenant] tenant membership support missing", membershipError);
        return NextResponse.json(
          { message: "This account is not permitted to access the selected tenant" },
          { status: 403 },
        );
      }

      throw membershipError;
    }

    if (!membership) {
      return NextResponse.json(
        { message: "This account is not permitted to access the selected tenant" },
        { status: 403 },
      );
    }

    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({ tenant_id: tenantId })
      .eq("id", session.user.id);

    if (updateError) {
      console.error("[api/auth/tenant] update tenant failed", updateError);
      return NextResponse.json({ message: "Login failed, please try again later" }, { status: 500 });
    }

    const tenant = await loadTenantSummary(supabaseAdmin, tenantId);

    return NextResponse.json(
      {
        message: "Tenant switched",
        tenant,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[api/auth/tenant] unexpected", error);
    return NextResponse.json({ message: "Login failed, please try again later" }, { status: 500 });
  }
}
