import { redirect } from "next/navigation";

import { getServerAuthContext } from "@/lib/auth/server-context";
import { loadTenantSummary } from "@/lib/auth/tenant-context";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { Database } from "@/db/types";

import { JournalClient } from "./journal-client";

const PAGE_SIZE = 20;

type JournalRow = Database["public"]["Tables"]["journal_entries"]["Row"];
type BadgeRow = Database["public"]["Tables"]["badges"]["Row"];

export default async function JournalPage() {
  const auth = await getServerAuthContext();
  if (!auth) {
    redirect("/signin");
  }

  const tenantSummary = await loadTenantSummary(supabaseAdmin, auth.tenantId);

  const { data: entryRows, error: entriesError } = await supabaseAdmin
    .from("journal_entries")
    .select("*")
    .eq("user_id", auth.userId)
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE + 1);

  if (entriesError) {
    console.error("[journal] initial entries failed", entriesError);
    throw entriesError;
  }

  const hasMore = (entryRows?.length ?? 0) > PAGE_SIZE;
  const initialEntries: JournalRow[] = (entryRows ?? [])
    .slice(0, PAGE_SIZE)
    .map((row) => row);

  const nextCursor = hasMore
    ? entryRows?.[PAGE_SIZE]?.created_at ?? null
    : null;

  const { data: statsRow, error: statsError } = await supabaseAdmin
    .from("motivation_stats")
    .select("*")
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (statsError) {
    console.error("[journal] initial stats failed", statsError);
    throw statsError;
  }

  const { data: badgeRows, error: badgesError } = await supabaseAdmin
    .from("badges")
    .select("*")
    .eq("user_id", auth.userId)
    .eq("tenant_id", auth.tenantId)
    .order("acquired_at", { ascending: false });

  if (badgesError) {
    console.error("[journal] initial badges failed", badgesError);
    throw badgesError;
  }

  return (
    <JournalClient
      tenant={tenantSummary}
      initialEntries={initialEntries}
      initialCursor={nextCursor}
      initialStats={{
        streak: statsRow?.streak_days ?? 0,
        level: statsRow?.level ?? 1,
        badges: (badgeRows ?? []) as BadgeRow[],
      }}
    />
  );
}
