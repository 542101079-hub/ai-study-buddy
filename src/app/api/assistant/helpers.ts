import { supabaseAdmin } from "@/lib/supabase/server";
import type { ServerAuthContext } from "@/lib/auth/server-context";

export type SessionAccessRow = {
  id: string;
  tenant_id: string;
  user_id: string;
};

export async function getAccessibleSession(
  sessionId: string,
  auth: ServerAuthContext,
): Promise<SessionAccessRow | null> {
  const { data, error } = await supabaseAdmin
    .from("assistant_sessions")
    .select("id, tenant_id, user_id")
    .eq("id", sessionId)
    .maybeSingle<SessionAccessRow>();

  if (error) {
    console.error("[assistant session] access lookup failed", error);
    throw new Error("session_lookup_failed");
  }

  if (!data) {
    return null;
  }

  if (data.tenant_id !== auth.tenantId) {
    return null;
  }

  if (data.user_id !== auth.userId && auth.role !== "admin") {
    return null;
  }

  return data;
}
