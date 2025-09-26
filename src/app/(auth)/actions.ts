"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerActionClient } from "@supabase/auth-helpers-nextjs";
import type { SupabaseClient } from "@supabase/supabase-js";

import { formatValidationErrors, loginSchema, registerSchema } from "@/lib/auth/validation";
import { supabaseAdmin, createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/db/types";

type SupabaseDbClient = SupabaseClient<Database>;

const USERNAME_SUFFIX_ATTEMPTS = 5;

function normalizeBaseUsername(name: string | null | undefined, email: string) {
  const candidateFromName = name
    ?.trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "")
    .slice(0, 24);

  const candidateFromEmail = email.split("@")[0]?.toLowerCase().replace(/[^a-z0-9_]+/g, "");

  const base = candidateFromName || candidateFromEmail || "learner";
  return base.length >= 3 ? base.slice(0, 24) : `${base}${Math.random().toString(36).slice(2, 5)}`;
}

async function insertProfile(
  client: SupabaseDbClient,
  userId: string,
  username: string,
  fullName?: string,
  avatarUrl?: string,
) {
  let attempt = 0;
  let currentUsername = username;

  while (attempt < USERNAME_SUFFIX_ATTEMPTS) {
    const { data, error } = await client
      .from("profiles")
      .insert({
        id: userId,
        username: currentUsername,
        full_name: fullName ?? null,
        avatar_url: avatarUrl ?? null,
      })
      .select("id, username, full_name, avatar_url")
      .single();

    if (!error) {
      return data;
    }

    if ((error as { code?: string }).code === "23505") {
      currentUsername = `${username}${Math.random().toString(36).slice(2, 5)}`.slice(0, 24);
      attempt += 1;
      continue;
    }

    throw error;
  }

  throw new Error("无法生成唯一的用户名，请稍后重试");
}

function extractField(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export type AuthActionResult =
  | { success: true; message?: string }
  | { success: false; message: string; fieldErrors?: Record<string, string> };

export async function signUp(formData: FormData): Promise<AuthActionResult> {
  const supabase = createServerActionClient<Database>({ cookies });

  const payload = {
    name: extractField(formData, "name"),
    username: extractField(formData, "username") || undefined,
    email: extractField(formData, "email"),
    password: extractField(formData, "password"),
    avatarUrl: extractField(formData, "avatarUrl") || undefined,
  };

  const parsed = registerSchema.safeParse(payload);

  if (!parsed.success) {
    return {
      success: false,
      message: "注册信息有误",
      fieldErrors: formatValidationErrors(parsed.error),
    };
  }

  const { name, email, password, username: providedUsername, avatarUrl } = parsed.data;

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
      },
    });

    if (error) {
      const status = error.status ?? 400;
      if (status === 400 && error.message.toLowerCase().includes("registered")) {
        return {
          success: false,
          message: "邮箱已被使用",
          fieldErrors: { email: "该邮箱已注册" },
        };
      }

      console.error("[actions/signUp] auth.signUp failed", error);
      return { success: false, message: "注册失败，请稍后重试" };
    }

    const user = data.user;
    if (!user) {
      return { success: false, message: "注册失败，请稍后重试" };
    }

    if (!data.session) {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        console.error("[actions/signUp] signIn fallback failed", signInError);
        return { success: false, message: "注册成功，但登录失败，请稍后重试" };
      }
    }

    const baseUsername = (providedUsername || normalizeBaseUsername(name, email)).toLowerCase();

    try {
      await insertProfile(
        supabaseAdmin,
        user.id,
        baseUsername,
        name,
        avatarUrl,
      );
    } catch (profileError: any) {
      if (profileError && typeof profileError === "object" && profileError.code === "23505") {
        return {
          success: false,
          message: "用户名已被使用",
          fieldErrors: { username: "该用户名已被占用，请换一个" },
        };
      }

      console.error("[actions/signUp] insertProfile failed", profileError);
      return { success: false, message: "注册失败，请稍后重试" };
    }

    return { success: true, message: "注册成功" };
  } catch (error) {
    console.error("[actions/signUp] unexpected", error);
    return { success: false, message: "注册失败，请稍后重试" };
  }
}

export async function signIn(formData: FormData): Promise<AuthActionResult> {
  const supabase = createServerActionClient<Database>({ cookies });

  const payload = {
    email: extractField(formData, "email"),
    password: extractField(formData, "password"),
    remember: formData.get("remember") === "on",
  };

  const parsed = loginSchema.safeParse(payload);

  if (!parsed.success) {
    return {
      success: false,
      message: "登录信息有误",
      fieldErrors: formatValidationErrors(parsed.error),
    };
  }

  const { email, password } = parsed.data;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return {
      success: false,
      message: "邮箱或密码错误",
      fieldErrors: {
        email: "邮箱或密码错误",
        password: "邮箱或密码错误",
      },
    };
  }

  return { success: true, message: "登录成功" };
}

export async function signOut(): Promise<AuthActionResult> {
  const supabase = createServerActionClient<Database>({ cookies });

  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("[actions/signOut] signOut failed", error);
    return { success: false, message: "退出登录失败，请稍后重试" };
  }

  redirect("/");
  return { success: true, message: "已退出登录" };
}
