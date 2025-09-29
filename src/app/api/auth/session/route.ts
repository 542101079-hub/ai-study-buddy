import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

import { loadTenantScopedProfile, loadTenantSummary } from "@/lib/auth/tenant-context";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { Database } from "@/db/types";

export async function GET() {
  const supabase = createRouteHandlerClient<Database>({ cookies });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ user: null, session: null });
  }

  let profile;
  try {
    profile = await loadTenantScopedProfile(supabaseAdmin, session.user.id);
  } catch (profileError) {
    console.error("[auth/session] load profile failed", profileError);
    return NextResponse.json(
      { message: "无法加载用户信息，请稍后再试" },
      { status: 500 },
    );
  }

  if (!profile) {
    return NextResponse.json(
      { message: "Profile not found" },
      { status: 404 },
    );
  }

  let tenant;
  try {
    tenant = await loadTenantSummary(supabaseAdmin, profile.tenant_id);
  } catch (tenantError) {
    console.error("[auth/session] load tenant failed", tenantError);
    return NextResponse.json(
      { message: "无法加载用户信息，请稍后再试" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    user: {
      id: session.user.id,
      email: session.user.email,
      profile,
      tenant,
    },
    session: {
      expiresAt: session.expires_at
        ? new Date(session.expires_at * 1000).toISOString()
        : null,
    },
  });
}
