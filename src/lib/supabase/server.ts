import "server-only";

import { cookies } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/db/types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
}

if (!serviceRoleKey) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
}

export const supabaseAdmin = createClient<Database>(
  supabaseUrl,
  serviceRoleKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  },
);

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  return createServerComponentClient<Database>({ cookies: () => cookieStore });
}

export async function getServerSession() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { session },
    error
  } = await supabase.auth.getSession();
  
  if (error) {
    console.error("[getServerSession] error:", error);
    return null;
  }
  
  return session;
}

export async function getServerUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();
  
  if (error) {
    console.error("[getServerUser] error:", error);
    return null;
  }
  
  return user;
}
