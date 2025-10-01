import { redirect } from "next/navigation";

import { getServerSession } from "@/lib/supabase/server";

import { TenantChoiceClient } from "./tenant-choice-client";

export const dynamic = "force-dynamic";

export default async function TenantChoicePage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/signin");
  }

  return <TenantChoiceClient />;
}
