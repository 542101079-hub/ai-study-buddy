import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, getServerSession } from "@/lib/supabase/server";
import { createProfileWithUniqueUsername, normalizeBaseUsername } from "@/lib/auth/register";
import { formatValidationErrors, registerSchema } from "@/lib/auth/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession();
    
    if (!session) {
      return NextResponse.json({ message: "Authentication required" }, { status: 401 });
    }

    // 使用service role获取当前用户profile
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, role, tenant_id")
      .eq("id", session.user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ message: "Admin access required" }, { status: 403 });
    }

    // 使用service role获取成员列表
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id, username, full_name, avatar_url, role")
      .eq("tenant_id", profile.tenant_id)
      .order("username", { nullsFirst: false });

    if (error) {
      console.error("[api/admin/members] GET error:", error);
      return NextResponse.json({ message: "Failed to load member list" }, { status: 500 });
    }

    return NextResponse.json({ members: data ?? [] });
  } catch (error) {
    console.error("[api/admin/members] GET unexpected error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session) {
      return NextResponse.json({ message: "Authentication required" }, { status: 401 });
    }

    // 使用service role获取当前用户profile
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, role, tenant_id")
      .eq("id", session.user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ message: "Admin access required" }, { status: 403 });
    }

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return NextResponse.json({ message: "无法读取提交数据" }, { status: 400 });
    }

    const parsed = registerSchema.safeParse(payload);

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
    const role: 'admin' = 'admin';

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

      console.error("[api/admin/members] createUser failed", createUserError);
      return NextResponse.json(
        { message: "创建管理员失败，请稍后再试" },
        { status: 500 },
      );
    }

    const user = createUserData.user;
    if (!user) {
      return NextResponse.json(
        { message: "创建管理员失败，请稍后再试" },
        { status: 500 },
      );
    }

    const baseUsername = (providedUsername || normalizeBaseUsername(name, email)).toLowerCase();

    let memberProfile;
    try {
      memberProfile = await createProfileWithUniqueUsername(supabaseAdmin, {
        id: user.id,
        tenantId: profile.tenant_id,
        baseUsername,
        fullName: name,
        avatarUrl: avatarUrl ?? null,
        role,
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

      console.error("[api/admin/members] insertProfile failed", profileError);
      return NextResponse.json(
        { message: "创建管理员失败，请稍后再试" },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        message: "管理员创建成功",
        member: memberProfile,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[api/admin/members] POST unexpected error:", error);
    return NextResponse.json(
      { message: "创建管理员失败，请稍后再试" },
      { status: 500 },
    );
  }
}