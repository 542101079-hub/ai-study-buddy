import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

import { adminRegisterSchema, formatValidationErrors } from "@/lib/auth/validation";
import { createProfileWithUniqueUsername, normalizeBaseUsername } from "@/lib/auth/register";
import { supabaseAdmin } from "@/lib/supabase/server";
import { createTenant, deriveTenantMetadata } from "@/lib/tenants";
import type { Database } from "@/db/types";

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient<Database>({ cookies });

  let json: unknown;

  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ message: "无法读取提交数据" }, { status: 400 });
  }

  const parsed = adminRegisterSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "注册信息有误",
        fieldErrors: formatValidationErrors(parsed.error),
      },
      { status: 400 },
    );
  }

  const {
    name,
    email,
    password,
    username: providedUsername,
    avatarUrl,
    tenantName,
    tenantLogoUrl,
    tenantTagline,
  } = parsed.data;

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
            fieldErrors: { email: "请使用新的邮箱" },
          },
          { status: 409 },
        );
      }

      console.error("[auth/admin-register] createUser failed", createUserError);
      return NextResponse.json(
        { message: "注册失败，请稍后再试" },
        { status: 500 },
      );
    }

    const user = createUserData.user;

    if (!user) {
      return NextResponse.json(
        { message: "注册失败，请稍后再试" },
        { status: 500 },
      );
    }

    const signInResult = await supabase.auth.signInWithPassword({ email, password });

    if (signInResult.error) {
      console.error("[auth/admin-register] signIn failed", signInResult.error);
      return NextResponse.json(
        { message: "注册成功但登录失败，请稍后再试" },
        { status: 500 },
      );
    }

    const baseUsername = (providedUsername || normalizeBaseUsername(name, email)).toLowerCase();

    const tenantMeta = deriveTenantMetadata(name, baseUsername, email, { tenantName });
    let tenant;
    try {
      tenant = await createTenant(supabaseAdmin, tenantMeta.name, tenantMeta.slugBase, {
        logoUrl: tenantLogoUrl,
        tagline: tenantTagline,
      });
    } catch (tenantError: any) {
      console.error("[auth/admin-register] createTenant failed", tenantError);
      return NextResponse.json(
        { message: "工作区创建失败，请稍后再试" },
        { status: 500 },
      );
    }

    let profile;
    try {
      profile = await createProfileWithUniqueUsername(supabaseAdmin, {
        id: user.id,
        tenantId: tenant.id,
        baseUsername,
        fullName: name,
        avatarUrl: avatarUrl ?? null,
        role: 'admin',
      });
    } catch (profileError: any) {
      if ((profileError as { code?: string } | null)?.code === "23505") {
        return NextResponse.json(
          {
            message: "用户名已被使用",
            fieldErrors: { username: "该用户名已被占用，请换一个" },
          },
          { status: 409 },
        );
      }

      console.error("[auth/admin-register] insertProfile failed", profileError);
      return NextResponse.json(
        { message: "注册失败，请稍后再试" },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        message: "管理员创建成功",
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
    console.error("[auth/admin-register] unexpected", error);
    return NextResponse.json(
      { message: "注册失败，请稍后再试" },
      { status: 500 },
    );
  }
}
