import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { z } from "zod";

import type { Database } from "@/db/types";
import { createTenant } from "@/lib/tenants";
import { supabaseAdmin } from "@/lib/supabase/server";

const payloadSchema = z.object({
  name: z.string().min(1, "请填写租户名称").max(120, "租户名称不能超过 120 个字符"),
  tagline: z
    .string()
    .trim()
    .max(160, "租户标语不能超过 160 个字符")
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  logoUrl: z
    .string({ required_error: "请上传租户 Logo" })
    .url("Logo 链接格式不正确"),
});

function slugifyName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient<Database>({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ message: "未登录或会话失效" }, { status: 401 });
  }

  const payloadResult = payloadSchema.safeParse(await request.json());

  if (!payloadResult.success) {
    const formatted = payloadResult.error.flatten();
    return NextResponse.json(
      {
        message: "表单校验失败",
        fieldErrors: formatted.fieldErrors,
      },
      { status: 422 },
    );
  }

  const { name, tagline, logoUrl } = payloadResult.data;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .maybeSingle();

  if (profileError) {
    console.error("[tenants/create] load profile failed", profileError);
    return NextResponse.json({ message: "无法验证管理员身份" }, { status: 500 });
  }

  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ message: "仅管理员可创建租户" }, { status: 403 });
  }

  const slugBase = slugifyName(name) || "tenant";

  try {
    const tenant = await createTenant(supabaseAdmin, name, slugBase, {
      logoUrl,
      tagline: tagline ?? null,
    });

    return NextResponse.json(
      {
        message: "租户创建成功",
        tenant,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[tenants/create] createTenant failed", error);
    return NextResponse.json({ message: "创建租户失败，请稍后再试" }, { status: 500 });
  }
}
