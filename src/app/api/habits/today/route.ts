import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { supabaseAdmin } from "@/lib/supabase/server";
import { getServerAuthContext } from "@/lib/auth/server-context";
import { buildHabitSummary } from "@/lib/habits/summary";

const querySchema = z
  .object({
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (expected YYYY-MM-DD)")
      .optional(),
  })
  .optional();

export async function GET(request: NextRequest) {
  const auth = await getServerAuthContext();
  if (!auth) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const rawQuery = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parsed = querySchema.safeParse(rawQuery);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_query", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  let summary;
  try {
    summary = await buildHabitSummary({
      supabase: supabaseAdmin,
      auth,
      date: parsed.data?.date,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_DATE") {
      return NextResponse.json({ error: "invalid_date" }, { status: 400 });
    }
    console.error("[habits] summary build failed", error);
    return NextResponse.json({ error: "failed_to_load" }, { status: 500 });
  }

  return NextResponse.json(summary);
}
