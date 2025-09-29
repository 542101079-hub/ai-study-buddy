import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

import { loadTenantScopedProfile, loadTenantSummary } from "@/lib/auth/tenant-context";
import type { Database } from "@/db/types";

export async function GET() {
  const supabase = createRouteHandlerClient<Database>({ cookies });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ user: null, session: null });
  }

  const profile = await loadTenantScopedProfile(supabase, session.user.id);

  if (!profile) {
    return NextResponse.json(
      { message: "Profile not found" },
      { status: 404 },
    );
  }

  const tenant = await loadTenantSummary(supabase, profile.tenant_id);

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

