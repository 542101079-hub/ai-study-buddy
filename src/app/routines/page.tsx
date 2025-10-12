import { redirect } from "next/navigation";

import { getServerAuthContext } from "@/lib/auth/server-context";
import { supabaseAdmin } from "@/lib/supabase/server";
import { buildHabitSummary } from "@/lib/habits/summary";

import { RoutinesClient } from "./routines-client";

export const dynamic = "force-dynamic";

export default async function RoutinesPage() {
  const auth = await getServerAuthContext();
  if (!auth) {
    redirect("/signin");
  }

  try {
    const summary = await buildHabitSummary({
      supabase: supabaseAdmin,
      auth,
    });

    return <RoutinesClient initialSummary={summary} />;
  } catch (error) {
    console.error("[routines] load summary failed", error);
    redirect("/dashboard");
  }
}
