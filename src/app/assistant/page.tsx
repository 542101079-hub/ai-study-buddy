import { redirect } from "next/navigation";

import { getServerAuthContext } from "@/lib/auth/server-context";
import { loadTenantSummary } from "@/lib/auth/tenant-context";
import { supabaseAdmin } from "@/lib/supabase/server";

import { AssistantClient } from "./assistant-client";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AssistantPage({ searchParams }: PageProps) {
  const auth = await getServerAuthContext();

  if (!auth) {
    redirect("/");
  }

  const resolvedParams = (await searchParams) ?? {};
  const initialSessionParam = resolvedParams?.s;
  const initialSessionId =
    typeof initialSessionParam === "string" ? initialSessionParam : null;

  const tenantSummary = await loadTenantSummary(supabaseAdmin, auth.tenantId);

  return (
    <AssistantClient tenant={tenantSummary} initialSessionId={initialSessionId} />
  );
}
