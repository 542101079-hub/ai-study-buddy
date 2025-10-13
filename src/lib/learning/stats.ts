import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/db/types";

type LearningRecord = Database["public"]["Tables"]["learning_records"]["Row"];
type LearningTask = Database["public"]["Tables"]["learning_tasks"]["Row"];
type LearningGoal = Database["public"]["Tables"]["learning_goals"]["Row"];

export type LearningStats = {
  totalStudyTime: number;
  averageStudyTime: number;
  studyDays: number;
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  totalGoals: number;
  activeGoals: number;
  completedGoals: number;
  averageProductivity: number | null;
  averageMood: number | null;
  dailyStudyTime: Array<{ date: string; minutes: number }>;
  studyTypeDistribution: Array<{ type: string; count: number }>;
  weeklyGoal: number;
  weeklyProgress: number;
};

type GetLearningStatsOptions = {
  periodDays?: number;
};

export async function getLearningStats(
  client: SupabaseClient<Database>,
  userId: string,
  options: GetLearningStatsOptions = {},
): Promise<LearningStats> {
  const periodDays = Math.max(1, options.periodDays ?? 30);

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - periodDays);

  const { data: learningRecords, error: recordsError } = await client
    .from("learning_records")
    .select("created_at, duration_minutes, productivity_score, mood_score, session_data, session_type")
    .eq("user_id", userId)
    .gte("created_at", startDate.toISOString())
    .lte("created_at", endDate.toISOString());

  if (recordsError) {
    console.error("[learning/stats] failed to load learning_records", recordsError);
    throw new Error("Failed to load learning records");
  }

  const { data: tasks, error: tasksError } = await client
    .from("learning_tasks")
    .select("status, completed_at, estimated_minutes, actual_minutes, created_at")
    .eq("user_id", userId)
    .gte("created_at", startDate.toISOString())
    .lte("created_at", endDate.toISOString());

  if (tasksError) {
    console.error("[learning/stats] failed to load learning_tasks", tasksError);
    throw new Error("Failed to load learning tasks");
  }

  const { data: goals, error: goalsError } = await client
    .from("learning_goals")
    .select("status, type, current_level, target_level")
    .eq("user_id", userId);

  if (goalsError) {
    console.error("[learning/stats] failed to load learning_goals", goalsError);
    throw new Error("Failed to load learning goals");
  }

  const totalStudyMinutes = sumMinutes(learningRecords);
  const averageStudyTime = calculateAverageMinutes(learningRecords);
  const studyDays = countStudyDays(learningRecords);
  const completedTasks = tasks.filter((task) => task.status === "completed").length;
  const completionRate = calculateCompletionRate(tasks, completedTasks);
  const averageProductivity = calculateAverageScore(learningRecords, "productivity_score");
  const averageMood = calculateAverageScore(learningRecords, "mood_score");

  return {
    totalStudyTime: totalStudyMinutes,
    averageStudyTime,
    studyDays,
    totalTasks: tasks.length,
    completedTasks,
    completionRate,
    totalGoals: goals.length,
    activeGoals: goals.filter((goal) => goal.status === "active").length,
    completedGoals: goals.filter((goal) => goal.status === "completed").length,
    averageProductivity,
    averageMood,
    dailyStudyTime: calculateDailyStudyTime(learningRecords, periodDays),
    studyTypeDistribution: calculateStudyTypeDistribution(learningRecords),
    weeklyGoal: 300,
    weeklyProgress: calculateWeeklyProgress(learningRecords),
  };
}

function sumMinutes(records: LearningRecord[]): number {
  return records.reduce((sum, record) => sum + (record.duration_minutes ?? 0), 0);
}

function calculateAverageMinutes(records: LearningRecord[]): number {
  if (records.length === 0) {
    return 0;
  }

  const total = sumMinutes(records);
  return Math.round(total / records.length);
}

function countStudyDays(records: LearningRecord[]): number {
  const uniqueDays = new Set(
    records
      .map((record) => record.created_at)
      .filter(Boolean)
      .map((createdAt) => new Date(createdAt as string).toDateString())
      .filter((value) => value !== "Invalid Date"),
  );
  return uniqueDays.size;
}

function calculateCompletionRate(tasks: LearningTask[], completedTasks: number): number {
  if (tasks.length === 0) {
    return 0;
  }
  return Math.round((completedTasks / tasks.length) * 100);
}

function calculateAverageScore(
  records: LearningRecord[],
  key: "productivity_score" | "mood_score",
): number | null {
  const scored = records.filter((record) => typeof record[key] === "number");
  if (scored.length === 0) {
    return null;
  }

  const total = scored.reduce((sum, record) => sum + (record[key] ?? 0), 0);
  return Math.round(((total / scored.length) + Number.EPSILON) * 10) / 10;
}

function calculateDailyStudyTime(records: LearningRecord[], days: number) {
  const result: Array<{ date: string; minutes: number }> = [];
  const today = new Date();

  for (let i = 0; i < days; i += 1) {
    const day = new Date(today);
    day.setDate(today.getDate() - i);
    const key = day.toISOString().split("T")[0];
    result.push({ date: key, minutes: 0 });
  }

  const lookup = new Map(result.map(({ date }) => [date, 0]));

  records.forEach((record) => {
    const createdAt = record.created_at;
    if (!createdAt) return;
    const key = new Date(createdAt).toISOString().split("T")[0];
    if (lookup.has(key)) {
      lookup.set(key, (lookup.get(key) ?? 0) + (record.duration_minutes ?? 0));
    }
  });

  return result
    .map(({ date }) => ({ date, minutes: lookup.get(date) ?? 0 }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function calculateStudyTypeDistribution(records: LearningRecord[]) {
  const counts = new Map<string, number>();
  records.forEach((record) => {
    const sessionData = record.session_data as { task_type?: string } | null;
    const type = sessionData?.task_type || record.session_type || "other";
    counts.set(type, (counts.get(type) ?? 0) + 1);
  });

  return Array.from(counts.entries()).map(([type, count]) => ({ type, count }));
}

function calculateWeeklyProgress(records: LearningRecord[]) {
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  return records
    .filter((record) => {
      const createdAt = record.created_at;
      if (!createdAt) return false;
      return new Date(createdAt) >= weekStart;
    })
    .reduce((sum, record) => sum + (record.duration_minutes ?? 0), 0);
}
