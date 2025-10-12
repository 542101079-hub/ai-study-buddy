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

const completeSchema = z.object({
  habitCode: z
    .string()
    .refine((value): value is HabitCode => HABIT_CODE_SET.has(value as HabitCode), "invalid_habit"),
  actualMinutes: z.number().min(0).max(1440).optional(),
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
  const parsed = completeSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { habitCode, actualMinutes } = parsed.data;

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
    console.error("[habits] complete load failed", error);
    return NextResponse.json({ error: "failed_to_load" }, { status: 500 });
  }

  if (!run) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const nowIso = habitNowIso();
  let minutes: number;

  if (typeof actualMinutes === "number") {
    minutes = actualMinutes;
  } else if (run.started_at) {
    const started = new Date(run.started_at).getTime();
    const nowMs = new Date(nowIso).getTime();
    const diffMinutes = Math.max(0, Math.round((nowMs - started) / 60000));
    minutes = diffMinutes > 0 ? diffMinutes : run.planned_minutes ?? 0;
  } else {
    minutes = run.planned_minutes ?? 0;
  }

  minutes = Math.min(1440, Math.max(1, minutes));
  const meta = mergeHabitMeta(run.meta, habitCode, {
    lastCompletedAt: nowIso,
    lastActualMinutes: minutes,
  });

  const { data: updated, error: updateError } = await supabaseAdmin
    .from("habit_runs")
    .update({
      status: "done",
      actual_minutes: minutes,
      completed_at: nowIso,
      updated_at: nowIso,
      meta,
    })
    .eq("id", run.id)
    .eq("tenant_id", auth.tenantId)
    .eq("user_id", auth.userId)
    .select("*")
    .single();

  if (updateError) {
    console.error("[habits] complete update failed", updateError);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    data: updated,
  });
}
