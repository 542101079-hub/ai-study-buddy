"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerActionClient } from "@supabase/auth-helpers-nextjs";

import { formatValidationErrors, loginSchema, registerSchema } from "@/lib/auth/validation";
import { supabaseAdmin } from "@/lib/supabase/server";
import { createProfileWithUniqueUsername, normalizeBaseUsername } from "@/lib/auth/register";
import type { Database } from "@/db/types";

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
    tenantId: extractField(formData, "tenantId"),
  };

  const parsed = registerSchema.safeParse(payload);

  if (!parsed.success) {
    return {
      success: false,
      message: "注册信息有误",
      fieldErrors: formatValidationErrors(parsed.error),
    };
  }

  const { name, email, password, username: providedUsername, avatarUrl, tenantId } = parsed.data;

  if (!tenantId) {
    return {
      success: false,
      message: "请选择要加入的工作区",
      fieldErrors: { tenantId: "请选择要加入的工作区" },
    };
  }

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
          fieldErrors: { email: "请使用新的邮箱" },
        };
      }

      console.error("[actions/signUp] auth.signUp failed", error);
      return { success: false, message: "注册失败，请稍后再试" };
    }

    const user = data.user;
    if (!user) {
      return { success: false, message: "注册失败，请稍后再试" };
    }

    if (!data.session) {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        console.error("[actions/signUp] signIn fallback failed", signInError);
        return { success: false, message: "注册成功但登录失败，请稍后再试" };
      }
    }

    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from("tenants")
      .select("id")
      .eq("id", tenantId)
      .maybeSingle();

    if (tenantError) {
      console.error("[actions/signUp] load tenant failed", tenantError);
      return { success: false, message: "加入工作区失败，请稍后再试" };
    }

    if (!tenant) {
      return {
        success: false,
        message: "选择的工作区不存在",
        fieldErrors: { tenantId: "请选择有效的工作区" },
      };
    }

    const baseUsername = (providedUsername || normalizeBaseUsername(name, email)).toLowerCase();

    try {
      await createProfileWithUniqueUsername(supabaseAdmin, {
        id: user.id,
        tenantId: tenant.id,
        baseUsername,
        fullName: name,
        avatarUrl: avatarUrl ?? null,
        role: 'user',
      });
    } catch (profileError: any) {
      if ((profileError as { code?: string } | null)?.code === "23505") {
        return {
          success: false,
          message: "用户名已被使用",
          fieldErrors: { username: "该用户名已被占用，请换一个" },
        };
      }

      console.error("[actions/signUp] insertProfile failed", profileError);
      return { success: false, message: "注册失败，请稍后再试" };
    }

    return { success: true, message: "注册成功" };
  } catch (error) {
    console.error("[actions/signUp] unexpected", error);
    return { success: false, message: "注册失败，请稍后再试" };
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
    return { success: false, message: "退出登录失败，请稍后再试" };
  }

  redirect("/");
  return { success: true, message: "已退出登录" };
}
