
import { NextResponse } from "next/server";

import { withAdminRoute } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

export const GET = withAdminRoute(async (_request, _context, { supabase, profile }) => {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url, role")
    .eq("tenant_id", profile.tenant_id)
    .order("username", { nulls: "last" });

  if (error) {
    console.error("[api/admin/members]", error);
    return NextResponse.json({ message: "Failed to load member list" }, { status: 500 });
  }

  return NextResponse.json({ members: data ?? [] });
});
