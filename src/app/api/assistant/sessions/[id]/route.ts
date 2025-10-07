import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { supabaseAdmin } from "@/lib/supabase/server";
import { getServerAuthContext } from "@/lib/auth/server-context";
import { getAccessibleSession } from "../../helpers";

const updateSchema = z.object({
  title: z
    .string()
    .min(1, "title_required")
    .max(80, "title_too_long"),
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await getServerAuthContext();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: sessionId } = await context.params;
  if (!sessionId) {
    return NextResponse.json({ error: "Session id required" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = updateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  let session;
  try {
    session = await getAccessibleSession(sessionId, auth);
  } catch {
    return NextResponse.json({ error: "Failed to load session" }, { status: 500 });
  }

  if (!session) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data, error } = await supabaseAdmin
    .from("assistant_sessions")
    .update({
      title: parsed.data.title.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId)
    .select("*")
    .single();

  if (error) {
    console.error("[assistant session] rename failed", error);
    return NextResponse.json({ error: "Failed to update session" }, { status: 400 });
  }

  return NextResponse.json({ session: data });
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await getServerAuthContext();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: sessionId } = await context.params;
  if (!sessionId) {
    return NextResponse.json({ error: "Session id required" }, { status: 400 });
  }

  let session;
  try {
    session = await getAccessibleSession(sessionId, auth);
  } catch {
    return NextResponse.json({ error: "Failed to load session" }, { status: 500 });
  }

  if (!session) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { error } = await supabaseAdmin
    .from("assistant_sessions")
    .delete()
    .eq("id", sessionId);

  if (error) {
    console.error("[assistant session] delete failed", error);
    return NextResponse.json({ error: "Failed to delete session" }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
