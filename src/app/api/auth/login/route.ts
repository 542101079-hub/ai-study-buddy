import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

import { formatValidationErrors, loginSchema } from "@/lib/auth/validation";
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

  const { email, password } = parsed.data;

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

  const { data: profileData } = await supabase
    .from("profiles")
    .select("username, full_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  return NextResponse.json(
    {
      message: "登录成功",
      user: {
        id: user.id,
        email: user.email,
        profile: profileData ?? null,
      },
    },
    { status: 200 },
  );
}

