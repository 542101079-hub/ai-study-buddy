import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { supabaseAdmin } from "@/lib/supabase/server";
import { getServerAuthContext } from "@/lib/auth/server-context";

const createSchema = z.object({
  title: z
    .string()
    .min(1, "title_required")
    .max(80, "title_too_long")
    .optional(),
});

const scopeSchema = z.enum(["self", "tenant"]).default("self");

export async function POST(request: NextRequest) {
  const auth = await getServerAuthContext();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const title = parsed.data.title?.trim() || "新的对话";

  const { data, error } = await supabaseAdmin
    .from("assistant_sessions")
    .insert({
      tenant_id: auth.tenantId,
      user_id: auth.userId,
      title,
    })
    .select("*")
    .single();

  if (error) {
    console.error("[assistant sessions] create failed", error);
    return NextResponse.json({ error: "Failed to create session" }, { status: 400 });
  }

  return NextResponse.json({ session: data }, { status: 201 });
}

export async function GET(request: NextRequest) {
  const auth = await getServerAuthContext();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const scopeParam = request.nextUrl.searchParams.get("scope");
  const scope = scopeSchema.safeParse(scopeParam).success ? (scopeParam as "self" | "tenant") : "self";

  const query = supabaseAdmin
    .from("assistant_sessions")
    .select("*")
    .order("updated_at", { ascending: false });

  if (scope === "tenant" && auth.role === "admin") {
    query.eq("tenant_id", auth.tenantId);
  } else {
    query.eq("user_id", auth.userId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[assistant sessions] fetch failed", error);
    return NextResponse.json({ error: "Failed to load sessions" }, { status: 400 });
  }

  return NextResponse.json({ sessions: data ?? [] });
}
