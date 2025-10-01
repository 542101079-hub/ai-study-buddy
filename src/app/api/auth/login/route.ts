import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

import { formatValidationErrors, loginSchema } from "@/lib/auth/validation";
import { loadTenantScopedProfile, loadTenantSummary } from "@/lib/auth/tenant-context";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { Database } from "@/db/types";

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

  const parsed = loginSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "登录信息有误",
        fieldErrors: formatValidationErrors(parsed.error),
      },
      { status: 400 },
    );
  }

  const { email, password, tenantId } = parsed.data;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return NextResponse.json(
      {
        message: "邮箱或密码错误",
        fieldErrors: {
          email: "邮箱或密码错误",
          password: "邮箱或密码错误",
        },
      },
      { status: 401 },
    );
  }

  const { user } = data;

  let profile;
  try {
    profile = await loadTenantScopedProfile(supabaseAdmin, user.id);
  } catch (profileError) {
    console.error("[auth/login] load profile failed", profileError);
    return NextResponse.json(
      { message: "登录失败，请稍后再试" },
      { status: 500 },
    );
  }

  if (!profile) {
    return NextResponse.json(
      { message: "Profile not found" },
      { status: 404 },
    );
  }

  if (profile.tenant_id !== tenantId) {
    await supabase.auth.signOut();
    return NextResponse.json(
      {
        message: "该账号不属于所选租户",
        fieldErrors: { tenantId: "该账号不属于所选租户" },
      },
      { status: 403 },
    );
  }

  let tenant;
  try {
    tenant = await loadTenantSummary(supabaseAdmin, tenantId);
  } catch (tenantError) {
    console.error("[auth/login] load tenant failed", tenantError);
    return NextResponse.json(
      { message: "登录失败，请稍后再试" },
      { status: 500 },
    );
  }
  if (!tenant) {
    await supabase.auth.signOut();
    return NextResponse.json(
      {
        message: "所选租户不存在或已被删除",
        fieldErrors: { tenantId: "所选租户不存在或已被删除" },
      },
      { status: 404 },
    );
  }

  return NextResponse.json(
    {
      message: "登录成功",
      user: {
        id: user.id,
        email: user.email,
        profile,
        tenant,
      },
    },
    { status: 200 },
  );
}

