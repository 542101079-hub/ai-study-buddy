import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/db/types";

const USERNAME_SUFFIX_ATTEMPTS = 5;
const PROFILE_COLUMNS = "id, tenant_id, username, full_name, avatar_url, role";

export function normalizeBaseUsername(name: string | null | undefined, email: string) {
  const candidateFromName = name
    ?.trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "")
    .slice(0, 24);

  const candidateFromEmail = email.split("@")[0]?.toLowerCase().replace(/[^a-z0-9_]+/g, "");

  const base = candidateFromName || candidateFromEmail || "learner";
  return base.length >= 3 ? base.slice(0, 24) : `${base}${Math.random().toString(36).slice(2, 5)}`;
}

export type TenantProfile = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "id" | "tenant_id" | "username" | "full_name" | "avatar_url" | "role"
>;

type CreateProfileArgs = {
  id: string;
  tenantId: string;
  baseUsername: string;
  fullName?: string | null;
  avatarUrl?: string | null;
  role?: TenantProfile["role"];
};

export async function createProfileWithUniqueUsername(
  client: SupabaseClient<Database>,
  args: CreateProfileArgs,
): Promise<TenantProfile> {
  const baseUsername = args.baseUsername;
  let attempt = 0;
  let currentUsername = baseUsername;

  while (attempt < USERNAME_SUFFIX_ATTEMPTS) {
    const insertPayload = {
      id: args.id,
      tenant_id: args.tenantId,
      username: currentUsername,
      full_name: args.fullName ?? null,
      avatar_url: args.avatarUrl ?? null,
      role: args.role ?? "user",
    } satisfies Database["public"]["Tables"]["profiles"]["Insert"];

    const { data, error } = await client
      .from("profiles")
      .insert(insertPayload)
      .select<TenantProfile>(PROFILE_COLUMNS)
      .single();

    if (!error && data) {
      return data;
    }

    if ((error as { code?: string } | null)?.code === "23505") {
      currentUsername = `${baseUsername}${Math.random().toString(36).slice(2, 5)}`.slice(0, 24);
      attempt += 1;
      continue;
    }

    throw error;
  }

  throw new Error("无法生成唯一的用户名，请稍后再试");
}
