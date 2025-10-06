
import { and, asc, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";

import { db, schema } from "@/lib/db";

const { dailyPlans, dailyTasks, learningTasks } = schema;

interface GenerateDailyPlanParams {
  userId: string;
  tenantId: string;
  planId?: string | null;
  date: string;
  dailyMinutes: number;
}

interface GeneratedDailyPlan {
  plan: typeof dailyPlans.$inferSelect;
  tasks: typeof dailyTasks.$inferSelect[];
}

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const MIN_BLOCK_MINUTES = 25;
const MAX_BLOCK_MINUTES = 180;
const TARGET_LOWER_RATIO = 0.9;
const TARGET_UPPER_RATIO = 1.1;
const TOKYO_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function parseTokyoDate(date: string): Date {
  if (!datePattern.test(date)) {
    throw new Error("date must be formatted as YYYY-MM-DD");
  }

  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date value: ${date}`);
  }

  return new Date(parsed.getTime() + TOKYO_OFFSET_MS);
}

function getTokyoDayRange(date: Date) {
  const tokyoStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return {
    start: tokyoStart,
    end: new Date(tokyoStart.getTime() + DAY_MS),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export async function generateDailyPlan({
  userId,
  tenantId,
  planId,
  date,
  dailyMinutes,
}: GenerateDailyPlanParams): Promise<GeneratedDailyPlan> {
  if (!userId || !tenantId) {
    throw new Error("userId and tenantId are required");
  }

  const planDate = parseTokyoDate(date);
  const { start: dayStart } = getTokyoDayRange(planDate);
  const previousDayStart = new Date(dayStart.getTime() - DAY_MS);

  const clampedMinutes = clamp(Math.round(dailyMinutes || 0), MIN_BLOCK_MINUTES, 1440);
  const targetRange = {
    min: Math.max(Math.round(clampedMinutes * TARGET_LOWER_RATIO), MIN_BLOCK_MINUTES),
    max: Math.round(clampedMinutes * TARGET_UPPER_RATIO),
  };

  return db.transaction(async (tx) => {
    const existing = await tx.query.dailyPlans.findFirst({
      where: (dailyPlan, helpers) =>
        helpers.and(
          helpers.eq(dailyPlan.userId, userId),
          helpers.eq(dailyPlan.date, planDate),
        ),
      with: {
        tasks: {
          orderBy: (dailyTask, { asc }) => [asc(dailyTask.orderNum)],
        },
      },
    });

    if (existing) {
      return {
        plan: existing,
        tasks: existing.tasks ?? [],
      };
    }

    const [insertedPlan] = await tx
      .insert(dailyPlans)
      .values({
        tenantId,
        userId,
        planId: planId ?? null,
        date: planDate,
        targetMinutes: clampedMinutes,
        actualMinutes: 0,
        status: "draft",
      })
      .returning();

    const baseConditions = [
      eq(learningTasks.tenantId, tenantId),
      eq(learningTasks.userId, userId),
      inArray(learningTasks.status, ["pending", "in_progress"]),
    ];

    if (planId) {
      baseConditions.push(eq(learningTasks.planId, planId));
    }

    const unfinishedYesterday = await tx
      .select({
        id: learningTasks.id,
        title: learningTasks.title,
        description: learningTasks.description,
        type: learningTasks.type,
        estimatedMinutes: learningTasks.estimatedMinutes,
        actualMinutes: learningTasks.actualMinutes,
        dueDate: learningTasks.dueDate,
        status: learningTasks.status,
        createdAt: learningTasks.createdAt,
      })
      .from(learningTasks)
      .where(
        and(
          ...baseConditions,
          inArray(learningTasks.status, ["pending", "in_progress"]),
          isNotNull(learningTasks.dueDate),
          sql`${learningTasks.dueDate} >= ${previousDayStart}` ,
          sql`${learningTasks.dueDate} < ${dayStart}`,
        ),
      )
      .orderBy(desc(learningTasks.status), asc(learningTasks.dueDate), asc(learningTasks.createdAt));

    const upcomingTasks = await tx
      .select({
        id: learningTasks.id,
        title: learningTasks.title,
        description: learningTasks.description,
        type: learningTasks.type,
        estimatedMinutes: learningTasks.estimatedMinutes,
        actualMinutes: learningTasks.actualMinutes,
        dueDate: learningTasks.dueDate,
        status: learningTasks.status,
        createdAt: learningTasks.createdAt,
      })
      .from(learningTasks)
      .where(
        and(
          ...baseConditions,
          inArray(learningTasks.status, ["pending", "in_progress"]),
          sql`${learningTasks.dueDate} IS NULL OR ${learningTasks.dueDate} >= ${dayStart}`
        ),
      )
      .orderBy(asc(learningTasks.dueDate), asc(learningTasks.createdAt))
      .limit(75);

    const seenTaskIds = new Set<string>();
    const candidates = [] as typeof unfinishedYesterday;

    for (const task of [...unfinishedYesterday, ...upcomingTasks]) {
      if (task.id && !seenTaskIds.has(task.id)) {
        seenTaskIds.add(task.id);
        candidates.push(task);
      }
    }

    const selected: typeof dailyTasks.$inferInsert[] = [];
    let totalMinutes = 0;

    for (const task of candidates) {
      if (totalMinutes >= targetRange.max) {
        break;
      }

      const estimated = clamp(task.estimatedMinutes ?? MIN_BLOCK_MINUTES, MIN_BLOCK_MINUTES, MAX_BLOCK_MINUTES);
      const remainingToMin = Math.max(targetRange.min - totalMinutes, 0);
      const remainingToMax = targetRange.max - totalMinutes;

      const desired = Math.max(remainingToMin, Math.min(estimated, remainingToMax));
      const allocated = clamp(desired, MIN_BLOCK_MINUTES, MAX_BLOCK_MINUTES);

      selected.push({
        tenantId,
        dailyPlanId: insertedPlan.id,
        topic: task.title,
        estimatedMinutes: allocated,
        actualMinutes: 0,
        status: "pending",
        orderNum: selected.length + 1,
      });

      totalMinutes += allocated;
    }

    if (selected.length === 0) {
      const fallbackMinutes = Math.max(clampedMinutes, MIN_BLOCK_MINUTES);
      const blocks = fallbackMinutes <= MIN_BLOCK_MINUTES * 2
        ? [{ topic: "Deep Focus Sprint", minutes: fallbackMinutes }]
        : [
            { topic: "Deep Focus Sprint", minutes: Math.round(fallbackMinutes * 0.6) },
            { topic: "Review & Practice", minutes: Math.round(fallbackMinutes * 0.25) },
            { topic: "Reflection & Planning", minutes: Math.max(fallbackMinutes - Math.round(fallbackMinutes * 0.6) - Math.round(fallbackMinutes * 0.25), MIN_BLOCK_MINUTES) },
          ];

      const correction = fallbackMinutes - blocks.reduce((sum, block) => sum + block.minutes, 0);
      blocks[blocks.length - 1].minutes += correction;

      blocks.forEach((block, index) => {
        selected.push({
          tenantId,
          dailyPlanId: insertedPlan.id,
          topic: block.topic,
          estimatedMinutes: block.minutes,
          actualMinutes: 0,
          status: "pending",
          orderNum: index + 1,
        });
      });
    }

    if (selected.length > 0 && totalMinutes < targetRange.min) {
      let deficit = targetRange.min - totalMinutes;
      const lastTask = selected[selected.length - 1];
      const available = MAX_BLOCK_MINUTES - lastTask.estimatedMinutes;
      const applied = Math.min(deficit, Math.max(available, 0));

      if (applied > 0) {
        lastTask.estimatedMinutes += applied;
        totalMinutes += applied;
        deficit -= applied;
      }

      if (deficit > 0) {
        const addedMinutes = clamp(deficit, MIN_BLOCK_MINUTES, MAX_BLOCK_MINUTES);
        selected.push({
          tenantId,
          dailyPlanId: insertedPlan.id,
          topic: "Focused Wrap-up",
          estimatedMinutes: addedMinutes,
          actualMinutes: 0,
          status: "pending",
          orderNum: selected.length + 1,
        });
        totalMinutes += addedMinutes;
      }
    }

    const insertedTasks = selected.length
      ? await tx.insert(dailyTasks).values(selected).returning()
      : [];

    return {
      plan: insertedPlan,
      tasks: insertedTasks,
    };
  });
}
