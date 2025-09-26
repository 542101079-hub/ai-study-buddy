import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

import type { Database } from "@/db/types";

export async function POST() {
  const supabase = createRouteHandlerClient<Database>({ cookies });

  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("[auth/logout] signOut failed", error);
    return NextResponse.json(
      { message: "退出登录失败，请稍后重试" },
      { status: 500 },
    );
  }

  return NextResponse.json({ message: "已退出登录" }, { status: 200 });
}
