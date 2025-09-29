
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/db/types";

const TENANT_SLUG_ATTEMPTS = 5;

function normalizeSlugCandidate(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function generateRandomSuffix(size = 4) {
  return Math.random().toString(36).slice(2, 2 + size);
}

export function deriveTenantMetadata(
  fullName: string | null | undefined,
  username: string,
  email: string,
) {
  const trimmedFullName = fullName?.trim();
  const emailLocalPart = email.split("@")[0] ?? "workspace";
  const baseIdentifier = trimmedFullName || username || emailLocalPart || "workspace";
  const safeIdentifier = baseIdentifier.slice(0, 60) || "workspace";

  const name = `${safeIdentifier}'s Workspace`.slice(0, 120);
  const slugBase =
    normalizeSlugCandidate(baseIdentifier) || normalizeSlugCandidate(emailLocalPart) || "tenant";

  return { name, slugBase };
}

export async function createTenant(
  supabase: SupabaseClient<Database>,
  name: string,
  slugBase: string,
) {
  let attempt = 0;
  const base = slugBase || "tenant";

  while (attempt < TENANT_SLUG_ATTEMPTS) {
    const slugSuffix = attempt === 0 ? "" : `-${generateRandomSuffix(5)}`;
    const slugCandidate = `${base}${slugSuffix}`.slice(0, 64);

    const { data, error } = await supabase
      .from("tenants")
      .insert({
        name,
        slug: slugCandidate,
      })
      .select("id, name, slug")
      .single();

    if (!error && data) {
      return data;
    }

    if (error && (error as { code?: string }).code === "23505") {
      attempt += 1;
      continue;
    }

    throw error;
  }

  throw new Error("Unable to create a unique tenant, please try again later");
}
