import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/db/types";
import {
  HABIT_DEFINITIONS,
  HABIT_CODES,
  HABIT_TIMEZONE,
  type HabitCode,
} from "./definitions";
import {
  ensureHabitRunsForDate,
  resolveHabitDate,
  normalizeHabitMeta,
  type HabitAuthContext,
  type HabitRunRow,
  type HabitRunStatus,
} from "./server";

type DailyTaskSummary = {
  id: string;
  topic: string;
  status: string;
};

async function loadLinkedTask(
  supabase: SupabaseClient<Database>,
  auth: HabitAuthContext,
  date: string,
): Promise<DailyTaskSummary | null> {
  const { data: plan, error: planError } = await supabase
    .from("daily_plans")
    .select("id")
    .eq("tenant_id", auth.tenantId)
    .eq("user_id", auth.userId)
    .eq("date", date)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (planError && planError.code !== "PGRST116") {
    console.error("[habit_summary] load plan failed", planError);
    throw new Error("PLAN_LOAD_FAILED");
  }

  if (!plan) {
    return null;
  }

  const { data: tasks, error: tasksError } = await supabase
    .from("daily_tasks")
    .select("id, topic, status")
    .eq("daily_plan_id", plan.id)
    .order("order_num", { ascending: true });

  if (tasksError) {
    console.error("[habit_summary] load tasks failed", tasksError);
    throw new Error("TASK_LOAD_FAILED");
  }

  if (!tasks || tasks.length === 0) {
    return null;
  }

  const inProgress = tasks.find((task) => task.status === "in_progress");
  if (inProgress) {
    return inProgress;
  }

  const pending = tasks.find((task) => task.status === "pending");
  return pending ?? null;
}

export type HabitSummaryItem = {
  id: string | null;
  code: HabitCode;
  title: string;
  description: string;
  plannedMinutes: number;
  actualMinutes: number;
  status: HabitRunStatus;
  startedAt: string | null;
  completedAt: string | null;
  order: number;
  actions: { label: string; href: string; variant?: "primary" | "secondary" }[];
  hints: string[];
  timer: { focusMinutes: number; breakMinutes?: number } | null;
  meta: Record<string, unknown>;
  currentTask: { id: string; title: string; status: string } | null;
};

export type HabitSummaryResponse = {
  date: string;
  timezone: string;
  totals: {
    plannedMinutes: number;
    actualMinutes: number;
    completedCount: number;
    totalCount: number;
    progressPercent: number;
  };
  items: HabitSummaryItem[];
};

export async function buildHabitSummary(params: {
  supabase: SupabaseClient<Database>;
  auth: HabitAuthContext;
  date?: string | null;
}): Promise<HabitSummaryResponse> {
  const { supabase, auth } = params;

  const { date } = resolveHabitDate(params.date ?? undefined);

  const runs = await ensureHabitRunsForDate(supabase, auth, date);
  const runsByCode = new Map<HabitCode, HabitRunRow>();
  runs.forEach((run) => runsByCode.set(run.habit_code as HabitCode, run));

  let linkedTask: DailyTaskSummary | null = null;
  try {
    linkedTask = await loadLinkedTask(supabase, auth, date);
  } catch (error) {
    console.warn("[habit_summary] linked task unavailable", error);
  }

  const items: HabitSummaryItem[] = HABIT_DEFINITIONS.map((definition) => {
    const run = runsByCode.get(definition.code);
    const plannedMinutes = run?.planned_minutes ?? definition.plannedMinutes;
    const actualMinutes = run?.actual_minutes ?? 0;
    const status: HabitRunStatus = (run?.status ?? "pending") as HabitRunStatus;
    const meta = normalizeHabitMeta(run?.meta ?? null, definition.code);

    return {
      id: run?.id ?? null,
      code: definition.code,
      title: definition.title,
      description: definition.description,
      plannedMinutes,
      actualMinutes,
      status,
      startedAt: run?.started_at ?? null,
      completedAt: run?.completed_at ?? null,
      order: definition.order,
      actions: definition.actions ?? [],
      hints: definition.hints ?? [],
      timer: definition.timer ?? null,
      meta,
      currentTask:
        definition.code === "pomodoro" && linkedTask
          ? {
              id: linkedTask.id,
              title: linkedTask.topic,
              status: linkedTask.status,
            }
          : null,
    };
  });

  const totalPlannedMinutes = items.reduce((sum, item) => sum + item.plannedMinutes, 0);
  const totalActualMinutes = items.reduce((sum, item) => {
    if (item.status !== "done") {
      return sum;
    }
    return sum + (item.actualMinutes || item.plannedMinutes);
  }, 0);
  const completedCount = items.filter((item) => item.status === "done").length;
  const progressPercent =
    totalPlannedMinutes > 0
      ? Math.min(100, Math.round((totalActualMinutes / totalPlannedMinutes) * 100))
      : 0;

  return {
    date,
    timezone: HABIT_TIMEZONE,
    totals: {
      plannedMinutes: totalPlannedMinutes,
      actualMinutes: totalActualMinutes,
      completedCount,
      totalCount: HABIT_CODES.length,
      progressPercent,
    },
    items,
  };
}
