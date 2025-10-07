import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/server";
import { getServerAuthContext } from "@/lib/auth/server-context";

export async function GET() {
  const auth = await getServerAuthContext();
  if (!auth) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { data: stats, error: statsError } = await supabaseAdmin
    .from("motivation_stats")
    .select("*")
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (statsError) {
    console.error("[motivation] fetch stats failed", statsError);
    return NextResponse.json({ ok: false, error: "fetch_failed" }, { status: 500 });
  }

  const { data: badges, error: badgesError } = await supabaseAdmin
    .from("badges")
    .select("*")
    .eq("user_id", auth.userId)
    .eq("tenant_id", auth.tenantId)
    .order("acquired_at", { ascending: false });

  if (badgesError) {
    console.error("[motivation] fetch badges failed", badgesError);
    return NextResponse.json({ ok: false, error: "fetch_failed" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    data: {
      streak: stats?.streak_days ?? 0,
      level: stats?.level ?? 1,
      lastCheckin: stats?.last_checkin ?? null,
      badges: badges ?? [],
    },
  });
}
