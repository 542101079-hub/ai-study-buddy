import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

import { loadTenantSummary } from "@/lib/auth/tenant-context";
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
}
