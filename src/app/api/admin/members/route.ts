import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { withAdminRoute } from "@/lib/auth/server-guards";
import { createProfileWithUniqueUsername, normalizeBaseUsername } from "@/lib/auth/register";
import { formatValidationErrors, registerSchema } from "@/lib/auth/validation";

export const dynamic = "force-dynamic";

export const GET = withAdminRoute(async (_request, _context, { profile }) => {
  try {
    if (profile.role !== "admin") {
      return NextResponse.json({ message: "Admin access required" }, { status: 403 });
    }

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
});

export const POST = withAdminRoute(async (request: NextRequest, _context, { profile }) => {
  try {
    if (profile.role !== "admin") {
      return NextResponse.json({ message: "Admin access required" }, { status: 403 });
    }

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return NextResponse.json({ message: "�޷���ȡ�ύ����" }, { status: 400 });
    }

    const parsed = registerSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "ע����Ϣ����",
          fieldErrors: formatValidationErrors(parsed.error),
        },
        { status: 400 },
      );
    }

    const { name, email, password, username: providedUsername, avatarUrl } = parsed.data;
    const role: "admin" = "admin";

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
            message: "�����ѱ�ʹ��",
            fieldErrors: { email: "��ʹ���µ�����" },
          },
          { status: 409 },
        );
      }

      console.error("[api/admin/members] createUser failed", createUserError);
      return NextResponse.json(
        { message: "��������Աʧ�ܣ����Ժ�����" },
        { status: 500 },
      );
    }

    const user = createUserData.user;
    if (!user) {
      return NextResponse.json(
        { message: "��������Աʧ�ܣ����Ժ�����" },
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
            message: "�û����ѱ�ʹ��",
            fieldErrors: { username: "���û����ѱ�ռ�ã��뻻һ��" },
          },
          { status: 409 },
        );
      }

      console.error("[api/admin/members] insertProfile failed", profileError);
      return NextResponse.json(
        { message: "��������Աʧ�ܣ����Ժ�����" },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        message: "����Ա�����ɹ�",
        member: memberProfile,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[api/admin/members] POST unexpected error:", error);
    return NextResponse.json(
      { message: "��������Աʧ�ܣ����Ժ�����" },
      { status: 500 },
    );
  }
});
