import { redirect } from "next/navigation";

import { getServerAuthContext } from "@/lib/auth/server-context";
import { loadTenantSummary } from "@/lib/auth/tenant-context";
import { supabaseAdmin } from "@/lib/supabase/server";

import { AssistantClient } from "./assistant-client";

type PageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function AssistantPage({ searchParams }: PageProps) {
  const auth = await getServerAuthContext();

  if (!auth) {
    redirect("/");
  }

  const tenantSummary = await loadTenantSummary(supabaseAdmin, auth.tenantId);
  const initialSessionParam = searchParams?.s;
  const initialSessionId =
    typeof initialSessionParam === "string" ? initialSessionParam : null;

  return (
    <AssistantClient tenant={tenantSummary} initialSessionId={initialSessionId} />
  );
}
