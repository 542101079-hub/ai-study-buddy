import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import type { SupabaseClient } from "@supabase/supabase-js";

import { formatValidationErrors, registerSchema } from "@/lib/auth/validation";
import { supabaseAdmin } from "@/lib/supabase/server";
import { createTenant, deriveTenantMetadata } from "@/lib/tenants";
import type { Database } from "@/db/types";

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
  supabase: SupabaseClient<Database>,
  userId: string,
  tenantId: string,
  username: string,
  fullName?: string,
  avatarUrl?: string,
  role: 'user' | 'admin' = 'user',
) {
  let attempt = 0;
  let currentUsername = username;
  while (attempt < 5) {
    const { data, error } = await supabase
      .from("profiles")
      .insert({
        id: userId,
        tenant_id: tenantId,
        username: currentUsername,
        full_name: fullName ?? null,
        avatar_url: avatarUrl ?? null,
        role,
      })
      .select("id, tenant_id, username, full_name, avatar_url, role")
      .single();

    if (!error) {
      return data;
    }

    if (error.code === "23505") {
      currentUsername = `${username}${Math.random().toString(36).slice(2, 5)}`.slice(0, 24);
      attempt += 1;
      continue;
    }

    throw error;
  }

  throw new Error("无法生成唯一的用户名，请稍后重试");
}

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient<Database>({ cookies });

  let json: unknown;

  try {
    json = await request.json();
  } catch {
    return NextResponse.json(
      { message: "无法解析提交的数据" },
      { status: 400 },
    );
  }

  const parsed = registerSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "注册信息有误",
        fieldErrors: formatValidationErrors(parsed.error),
      },
      { status: 400 },
    );
  }

  const { name, email, password, username: providedUsername, avatarUrl } = parsed.data;

  try {
    const { data: createUserData, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: name,
      },
    });

    if (createUserError) {
      const status = createUserError.status ?? 400;
      if (status === 422 || status === 409) {
        return NextResponse.json(
          {
            message: "邮箱已被使用",
            fieldErrors: { email: "该邮箱已注册" },
          },
          { status: 409 },
        );
      }

      console.error("[auth/register] createUser failed", createUserError);
      return NextResponse.json(
        { message: "注册失败，请稍后重试" },
        { status: 500 },
      );
    }

    const user = createUserData.user;

    if (!user) {
      return NextResponse.json(
        { message: "注册失败，请稍后重试" },
        { status: 500 },
      );
    }

    const signInResult = await supabase.auth.signInWithPassword({ email, password });

    if (signInResult.error) {
      console.error("[auth/register] signIn failed", signInResult.error);
      return NextResponse.json(
        { message: "注册成功，但登录失败，请稍后重试" },
        { status: 500 },
      );
    }

    const baseUsername = (providedUsername || normalizeBaseUsername(name, email)).toLowerCase();

    const tenantMeta = deriveTenantMetadata(name, baseUsername, email);
    let tenant;
    try {
      tenant = await createTenant(supabaseAdmin, tenantMeta.name, tenantMeta.slugBase);
    } catch (tenantError: any) {
      console.error("[auth/register] createTenant failed", tenantError);
      return NextResponse.json(
        { message: "创建工作区失败，请稍后再试" },
        { status: 500 },
      );
    }

    let profile;
    try {
      profile = await insertProfile(
        supabaseAdmin,
        user.id,
        tenant.id,
        baseUsername,
        name,
        avatarUrl,
        'admin',
      );
    } catch (profileError: any) {
      if (profileError && typeof profileError === "object" && profileError.code === "23505") {
        return NextResponse.json(
          {
            message: "用户名已被使用",
            fieldErrors: { username: "该用户名已被占用，请换一个" },
          },
          { status: 409 },
        );
      }

      console.error("[auth/register] insertProfile failed", profileError);
      return NextResponse.json(
        { message: "注册失败，请稍后重试" },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        message: "注册成功",
        user: {
          id: user.id,
          email: user.email,
          profile,
          tenant,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[auth/register] unexpected", error);
    return NextResponse.json(
      { message: "注册失败，请稍后重试" },
      { status: 500 },
    );
  }
}







