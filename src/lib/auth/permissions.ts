
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/db/types";
import { loadTenantScopedProfile, type TenantScopedProfile } from "./tenant-context";

export type AdminRouteContext = {
  supabase: SupabaseClient<Database>;
  profile: TenantScopedProfile;
};

type AdminHandler<TContext> = (
  request: NextRequest,
  context: TContext,
  auth: AdminRouteContext,
) => Promise<Response>;

export function withAdminRoute<TContext = Record<string, unknown>>(
  handler: AdminHandler<TContext>,
) {
  return async function adminGuard(request: NextRequest, context: TContext) {
    try {
      const supabase = createRouteHandlerClient<Database>({ cookies });
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
      }

      const profile = await loadTenantScopedProfile(supabase, session.user.id);

      if (!profile || profile.role !== "admin") {
        return NextResponse.json({ message: "You do not have permission to access this resource" }, { status: 403 });
      }

      return handler(request, context, { supabase, profile });
    } catch (error) {
      console.error("[auth/withAdminRoute]", error);
      return NextResponse.json({ message: "Server error" }, { status: 500 });
    }
  };
}
