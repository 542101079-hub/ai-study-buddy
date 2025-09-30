import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("tenants")
      .select("id, name, slug, logo_url, tagline")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("[api/tenants] failed to list tenants", error);
      return NextResponse.json({ message: "无法加载租户列表" }, { status: 500 });
    }

    return NextResponse.json({ tenants: data ?? [] }, { status: 200 });
  } catch (error) {
    console.error("[api/tenants] unexpected", error);
    return NextResponse.json({ message: "无法加载租户列表" }, { status: 500 });
  }
}
