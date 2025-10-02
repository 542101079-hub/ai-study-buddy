import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

import { formatValidationErrors } from "@/lib/auth/validation";
import { supabaseAdmin } from "@/lib/supabase/server";
import { createProfileWithUniqueUsername, normalizeBaseUsername } from "@/lib/auth/register";
import type { Database } from "@/db/types";
import { z } from "zod";

const createProfileSchema = z.object({
  name: z.string().min(1, "姓名不能为空").max(120, "姓名过长"),
  username: z.string().optional(),
  tenantId: z.string().uuid("请选择有效的工作区"),
});

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient<Database>({ cookies });

  // 检查用户是否已登录
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    return NextResponse.json(
      { message: "请先登录" },
      { status: 401 },
    );
  }

  let json: unknown;

  try {
    json = await request.json();
  } catch {
    return NextResponse.json(
      { message: "无法读取提交数据" },
      { status: 400 },
    );
  }

  const parsed = createProfileSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "提交信息有误",
        fieldErrors: formatValidationErrors(parsed.error),
      },
      { status: 400 },
    );
  }

  const { name, username: providedUsername, tenantId } = parsed.data;
  const user = session.user;

  try {
    // 检查用户是否已经有profile
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (existingProfile) {
      return NextResponse.json(
        { message: "用户档案已存在" },
        { status: 409 },
      );
    }

    // 验证tenant是否存在
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from("tenants")
      .select("id, name, slug, logo_url, tagline")
      .eq("id", tenantId)
      .maybeSingle();

    if (tenantError) {
      console.error("[auth/create-profile] load tenant failed", tenantError);
      return NextResponse.json(
        { message: "加入工作区失败，请稍后再试" },
        { status: 500 },
      );
    }

    if (!tenant) {
      return NextResponse.json(
        {
          message: "选择的工作区不存在",
          fieldErrors: { tenantId: "请选择有效的工作区" },
        },
        { status: 404 },
      );
    }

    // 生成用户名
    const baseUsername = (providedUsername || normalizeBaseUsername(name, user.email || "")).toLowerCase();

    // 创建profile
    let profile;
    try {
      profile = await createProfileWithUniqueUsername(supabaseAdmin, {
        id: user.id,
        tenantId: tenant.id,
        baseUsername,
        fullName: name,
        avatarUrl: null,
        role: 'user',
      });
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

      console.error("[auth/create-profile] insertProfile failed", profileError);
      return NextResponse.json(
        { message: "创建档案失败，请稍后再试" },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        message: "档案创建成功",
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
    console.error("[auth/create-profile] unexpected", error);
    return NextResponse.json(
      { message: "创建档案失败，请稍后再试" },
      { status: 500 },
    );
  }
}
