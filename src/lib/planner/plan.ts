
import { and, asc, eq, inArray, sql } from "drizzle-orm";

import { db, schema } from "@/lib/db";

const { learningPlans, learningTasks } = schema;

interface PlanOverviewParams {
  userId: string;
  tenantId: string;
  planId: string;
}

interface PhaseSummary {
  name: string;
  durationWeeks?: number | null;
  focusAreas: string[];
  totalWeeks: number;
  totalScheduledTasks: number;
}

interface TaskProgressSummary {
  total: number;
  completed: number;
  pending: number;
  inProgress: number;
  skipped: number;
  completionRate: number;
  estimatedMinutes: {
    total: number;
    remaining: number;
    completed: number;
  };
}

interface PlanOverviewResult {
  plan: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    startDate: Date | null;
    endDate: Date | null;
    createdAt: Date | null;
    updatedAt: Date | null;
    goal?: {
      id: string;
      title: string;
      type: string;
    } | null;
  };
  phases: PhaseSummary[];
  progress: TaskProgressSummary;
  upcomingTasks: Array<{
    id: string;
    title: string;
    description: string | null;
    estimatedMinutes: number;
    dueDate: Date | null;
    status: string;
  }>;
}

function parsePlanPhases(planData: unknown): PhaseSummary[] {
  const data = planData && typeof planData === "object" ? planData as Record<string, unknown> : {};
  const phases = Array.isArray(data.learning_phases) ? data.learning_phases : [];

  return phases.map((phase: any) => {
    const weeklyTasks = Array.isArray(phase?.weekly_tasks) ? phase.weekly_tasks : [];
    const totalScheduledTasks = weeklyTasks.reduce((sum: number, week: any) => {
      const tasks = Array.isArray(week?.tasks) ? week.tasks : [];
      return sum + tasks.length;
    }, 0);

    return {
      name: typeof phase?.phase_name === "string" ? phase.phase_name : "½×¶Î",
      durationWeeks: typeof phase?.duration_weeks === "number" ? phase.duration_weeks : null,
      focusAreas: Array.isArray(phase?.focus_areas) ? phase.focus_areas.filter((item: unknown) => typeof item === "string") : [],
      totalWeeks: weeklyTasks.length,
      totalScheduledTasks,
    };
  });
}

export async function getPlanOverview({
  userId,
  tenantId,
  planId,
}: PlanOverviewParams): Promise<PlanOverviewResult> {
  if (!userId || !tenantId || !planId) {
    throw new Error("userId, tenantId, and planId are required");
  }

  const plan = await db.query.learningPlans.findFirst({
    where: (plans, helpers) =>
      helpers.and(
        helpers.eq(plans.id, planId),
        helpers.eq(plans.userId, userId),
        helpers.eq(plans.tenantId, tenantId),
      ),
    with: {
      goal: {
        columns: {
          id: true,
          title: true,
          type: true,
        },
      },
    },
  });

  if (!plan) {
    throw new Error("Learning plan not found");
  }

  let planData: unknown = null;
  if (plan.planData) {
    planData = typeof plan.planData === "string" ? JSON.parse(plan.planData as string) : plan.planData;
  }

  const phases = parsePlanPhases(planData);

  const progressRows = await db
    .select({
      status: learningTasks.status,
      count: sql<number>`count(*)`,
      estimatedMinutes: sql<number>`coalesce(sum(${learningTasks.estimatedMinutes}), 0)`,
      actualMinutes: sql<number>`coalesce(sum(${learningTasks.actualMinutes}), 0)`,
    })
    .from(learningTasks)
    .where(
      and(
        eq(learningTasks.tenantId, tenantId),
        eq(learningTasks.userId, userId),
        eq(learningTasks.planId, planId),
      ),
    )
    .groupBy(learningTasks.status);

  const progress: TaskProgressSummary = {
    total: 0,
    completed: 0,
    pending: 0,
    inProgress: 0,
    skipped: 0,
    completionRate: 0,
    estimatedMinutes: {
      total: 0,
      remaining: 0,
      completed: 0,
    },
  };

  progressRows.forEach((row) => {
    const count = Number(row.count || 0);
    const estimated = Number(row.estimatedMinutes || 0);
    const actual = Number(row.actualMinutes || 0);

    progress.total += count;
    progress.estimatedMinutes.total += estimated;

    switch (row.status) {
      case "completed":
        progress.completed += count;
        progress.estimatedMinutes.completed += actual || estimated;
        break;
      case "in_progress":
        progress.inProgress += count;
        progress.estimatedMinutes.remaining += Math.max(estimated - actual, 0);
        break;
      case "pending":
        progress.pending += count;
        progress.estimatedMinutes.remaining += estimated;
        break;
      case "skipped":
        progress.skipped += count;
        break;
      default:
        progress.pending += count;
        progress.estimatedMinutes.remaining += estimated;
        break;
    }
  });

  if (progress.total > 0) {
    progress.completionRate = Number((progress.completed / progress.total).toFixed(2));
  }

  const upcomingTasks = await db
    .select({
      id: learningTasks.id,
      title: learningTasks.title,
      description: learningTasks.description,
      estimatedMinutes: learningTasks.estimatedMinutes,
      dueDate: learningTasks.dueDate,
      status: learningTasks.status,
    })
    .from(learningTasks)
    .where(
      and(
        eq(learningTasks.tenantId, tenantId),
        eq(learningTasks.userId, userId),
        eq(learningTasks.planId, planId),
        inArray(learningTasks.status, ["pending", "in_progress"]),
      ),
    )
    .orderBy(
      asc(learningTasks.dueDate),
      asc(learningTasks.createdAt),
    )
    .limit(5);

  return {
    plan: {
      id: plan.id,
      title: plan.title,
      description: plan.description,
      status: plan.status,
      startDate: plan.startDate ?? null,
      endDate: plan.endDate ?? null,
      createdAt: plan.createdAt ?? null,
      updatedAt: plan.updatedAt ?? null,
      goal: plan.goal ?? null,
    },
    phases,
    progress,
    upcomingTasks,
  };
}
