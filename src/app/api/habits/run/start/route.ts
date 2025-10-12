import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { supabaseAdmin } from "@/lib/supabase/server";
import { getServerAuthContext } from "@/lib/auth/server-context";
import {
  HABIT_CODE_SET,
  type HabitCode,
} from "@/lib/habits/definitions";
import {
  resolveHabitDate,
  getHabitRunForDate,
  mergeHabitMeta,
  habitNowIso,
} from "@/lib/habits/server";

const startSchema = z.object({
  habitCode: z
    .string()
    .refine((value): value is HabitCode => HABIT_CODE_SET.has(value as HabitCode), "invalid_habit"),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export async function POST(request: NextRequest) {
  const auth = await getServerAuthContext();
  if (!auth) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = startSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { habitCode } = parsed.data;

  let targetDate: string;
  try {
    targetDate = resolveHabitDate(parsed.data.date).date;
  } catch {
    return NextResponse.json({ error: "invalid_date" }, { status: 400 });
  }

  let run;
  try {
    run = await getHabitRunForDate(supabaseAdmin, auth, habitCode, targetDate, { ensure: true });
  } catch (error) {
    console.error("[habits] start load failed", error);
    return NextResponse.json({ error: "failed_to_load" }, { status: 500 });
  }

  if (!run) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const nowIso = habitNowIso();
  const meta = mergeHabitMeta(run.meta, habitCode, {
    lastStartedAt: nowIso,
  });

  const { data: updated, error: updateError } = await supabaseAdmin
    .from("habit_runs")
    .update({
      status: "doing",
      started_at: nowIso,
      actual_minutes: 0,
      updated_at: nowIso,
      meta,
    })
    .eq("id", run.id)
    .eq("tenant_id", auth.tenantId)
    .eq("user_id", auth.userId)
    .select("*")
    .single();

  if (updateError) {
    console.error("[habits] start update failed", updateError);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    data: updated,
  });
}
