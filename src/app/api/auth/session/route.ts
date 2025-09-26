import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

import type { Database } from "@/db/types";

export async function GET() {
  const supabase = createRouteHandlerClient<Database>({ cookies });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ user: null, session: null });
  }

  const { data: profileData } = await supabase
    .from("profiles")
    .select("username, full_name, avatar_url")
    .eq("id", session.user.id)
    .maybeSingle();

  return NextResponse.json({
    user: {
      id: session.user.id,
      email: session.user.email,
      profile: profileData ?? null,
    },
    session: {
      expiresAt: session.expires_at
        ? new Date(session.expires_at * 1000).toISOString()
        : null,
    },
  });
}

