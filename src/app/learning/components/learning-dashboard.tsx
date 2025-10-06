
"use client";

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface DailyPlanSummary {
  id: string;
  date: string | null;
  targetMinutes: number;
  actualMinutes: number;
  status: string;
}

type DailyTaskStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';


interface DailyTask {
  id: string;
  topic: string;
  estimatedMinutes: number;
  actualMinutes: number;
  status: DailyTaskStatus;
  orderNum?: number | null;
}

interface TaskStats {
  total: number;
  completed: number;
  pending: number;
  in_progress: number;
  total_estimated_minutes: number;
  completed_minutes: number;
}

interface LearningStats {
  totalStudyTime: number;
  studyDays: number;
  completedTasks: number;
  completionRate: number;
  weeklyProgress: number;
  weeklyGoal: number;
  averageProductivity?: number;
  averageMood?: number;
}

const STATUS_LABELS: Record<DailyTaskStatus, { label: string; classes: string }> = {
  pending: { label: '待开始', classes: 'border-white/15 text-white/70 bg-white/5' },
  in_progress: { label: '进行中', classes: 'border-blue-400/40 text-blue-200 bg-blue-500/10' },
  completed: { label: '已完成', classes: 'border-emerald-400/40 text-emerald-200 bg-emerald-500/10' },
  skipped: { label: '已跳过', classes: 'border-amber-400/40 text-amber-200 bg-amber-500/10' },
};

function formatDateLabel(value: string | Date | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
}

const DEFAULT_DAILY_MINUTES = 240;
const MIN_GENERATE_MINUTES = 30;
const MAX_GENERATE_MINUTES = 720;

function normalizeTask(task: any): DailyTask {
  return {
    id: task.id,
    topic: task.topic ?? task.title ?? '未命名任务',
    estimatedMinutes: Number(task.estimatedMinutes ?? task.estimated_minutes ?? 0),
    actualMinutes: Number(task.actualMinutes ?? task.actual_minutes ?? 0),
    status: (task.status ?? 'pending') as DailyTaskStatus,
    orderNum: task.orderNum ?? task.order_num ?? null,
  };
}

function normalizePlan(plan: any): DailyPlanSummary | null {
  if (!plan) return null;
  const dateValue = plan.date instanceof Date ? plan.date.toISOString().slice(0, 10) : plan.date ?? null;
  return {
    id: plan.id,
    date: dateValue,
    targetMinutes: Number(plan.targetMinutes ?? plan.target_minutes ?? 0),
    actualMinutes: Number(plan.actualMinutes ?? plan.actual_minutes ?? 0),
    status: plan.status ?? 'draft',
  };
}

function buildTaskStats(tasks: DailyTask[]): TaskStats {
  const totals = tasks.reduce(
    (acc, task) => {
      acc.total += 1;
      acc.totalMinutes += task.estimatedMinutes;
      if (task.status === 'completed') {
        acc.completed += 1;
        acc.completedMinutes += task.actualMinutes || task.estimatedMinutes;
      } else if (task.status === 'in_progress') {
        acc.inProgress += 1;
      } else if (task.status === 'pending') {
        acc.pending += 1;
      }
      return acc;
    },
    { total: 0, completed: 0, pending: 0, inProgress: 0, totalMinutes: 0, completedMinutes: 0 }
  );

  return {
    total: totals.total,
    completed: totals.completed,
    pending: totals.pending,
    in_progress: totals.inProgress,
    total_estimated_minutes: totals.totalMinutes,
    completed_minutes: totals.completedMinutes,
  };
}

export function LearningDashboard() {
  const [dailyPlan, setDailyPlan] = useState<DailyPlanSummary | null>(null);
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [taskStats, setTaskStats] = useState<TaskStats | null>(null);
  const [learningStats, setLearningStats] = useState<LearningStats | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [customMinutes, setCustomMinutes] = useState<number>(60);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  useEffect(() => {
    void loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [dailyResponse, statsResponse] = await Promise.all([
        fetch('/api/daily'),
        fetch('/api/learning/stats?period=7'),
      ]);

      if (dailyResponse.ok) {
        const data = await dailyResponse.json();
        const normalizedPlan = normalizePlan(data.plan);
        const normalizedTasks = Array.isArray(data.tasks) ? data.tasks.map(normalizeTask) : [];
        setDailyPlan(normalizedPlan);
        if (normalizedPlan?.targetMinutes) {
          setCustomMinutes(
            Math.min(Math.max(normalizedPlan.targetMinutes, MIN_GENERATE_MINUTES), MAX_GENERATE_MINUTES),
          );
        }
        setTasks(normalizedTasks);
        setTaskStats(buildTaskStats(normalizedTasks));
      } else {
        setDailyPlan(null);
        setTasks([]);
        setTaskStats(null);
      }

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setLearningStats(statsData.stats || null);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshFromPayload = (payload: any) => {
    const normalizedPlan = normalizePlan(payload?.plan);
    const normalizedTasks = Array.isArray(payload?.tasks) ? payload.tasks.map(normalizeTask) : [];
    if (normalizedPlan?.targetMinutes) {
      setCustomMinutes(
        Math.min(Math.max(normalizedPlan.targetMinutes, MIN_GENERATE_MINUTES), MAX_GENERATE_MINUTES),
      );
    }
    setDailyPlan(normalizedPlan);
    setTasks(normalizedTasks);
    setTaskStats(buil  const handleGeneratePlan = async () => {
    const safeMinutes = Math.min(
      MAX_GENERATE_MINUTES,
      Math.max(MIN_GENERATE_MINUTES, Math.round(customMinutes || DEFAULT_DAILY_MINUTES)),
    );
    setCustomMinutes(safeMinutes);
    setIsGenerating(true);
    try {
      const response = await fetch('/api/daily/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dailyMinutes: safeMinutes }),
      });

      if (!response.ok) {
        console.error('Failed to generate daily plan');
        return;
      }

      const data = await response.json();
      refreshFromPayload(data);
    } catch (error) {
      console.error('Error generating daily plan:', error);
    } finally {
      setIsGenerating(false);
    }
  };

dTaskStats(normalizedTasks));
  };

  const handleTaskStatusUpdate = async (
    taskId: string,
    status: DailyTaskStatus,
    actualMinutes?: number,
  ) => {
    setUpdatingTaskId(taskId);
    try {
      const response = await fetch(`/api/daily/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, actualMinutes }),
      });

      if (!response.ok) {
        console.error('Failed to update task status');
        return;
      }

      const data = await response.json();
      refreshFromPayload(data);
    } catch (error) {
      console.error('Error updating task:', error);
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const handleSkipTask = (taskId: string) => handleTaskStatusUpdate(taskId, 'skipped');

  const handleSkipToTomorrow = async (taskId: string) => {
    setUpdatingTaskId(taskId);
    try {
      const response = await fetch(`/api/daily/tasks/${taskId}/skip-to-tomorrow`, { method: 'POST' });
      if (!response.ok) {
        console.error('Failed to move task to tomorrow');
        return;
      }
      const data = await response.json();
      if (data?.today) {
        refreshFromPayload(data.today);
      } else if (data?.todayPlan && data?.todayTasks) {
        refreshFromPayload({ plan: data.todayPlan, tasks: data.todayTasks });
      } else {
        void loadDashboardData();
      }
    } catch (error) {
      console.error('Error moving task to tomorrow:', error);
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const handleStartTask = (taskId: string) => handleTaskStatusUpdate(taskId, 'in_progress');

  const handleCompleteTask = (task: DailyTask) =>
    handleTaskStatusUpdate(task.id, 'completed', task.actualMinutes || task.estimatedMinutes);

  const renderStatusBadge = (status: DailyTaskStatus) => {
    const meta = STATUS_LABELS[status];
    return <span className={`rounded-full border px-3 py-0.5 text-xs ${meta.classes}`}>{meta.label}</span>;
  };

  

const renderSummary = () => {
  if (!dailyPlan) {
    return (
      <div className="rounded-2xl border border-violet-500/40 bg-gradient-to-br from-violet-900/60 via-purple-900/50 to-slate-900/60 p-6 shadow-[0_18px_40px_rgba(91,33,182,0.35)]">
        <h3 className="text-lg font-semibold text-white">Daily study plan</h3>
        <p className="mt-2 text-sm text-white/70">No plan yet. Pick a target duration and let the assistant auto-build one for today.</p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
            <span className="text-xs text-white/60">Target minutes</span>
            <Input
              type="number"
              min={MIN_GENERATE_MINUTES}
              max={MAX_GENERATE_MINUTES}
              value={customMinutes}
              onChange={(event) =>
                setCustomMinutes(
                  Math.min(
                    Math.max(Number(event.target.value) || MIN_GENERATE_MINUTES, MIN_GENERATE_MINUTES),
                    MAX_GENERATE_MINUTES,
                  ),
                )
              }
              className="w-24 bg-transparent text-white"
            />
          </div>
          <Button
            onClick={() => void handleGeneratePlan()}
            disabled={isGenerating}
            className="bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-lg hover:from-violet-600 hover:to-purple-600"
          >
            {isGenerating ? 'Generating…' : 'Generate today’s plan'}
          </Button>
        </div>
      </div>
    );
  }

  const remainingMinutes = Math.max(dailyPlan.targetMinutes - dailyPlan.actualMinutes, 0);
  const progressPercent = dailyPlan.targetMinutes > 0
    ? Math.min(100, Math.round((dailyPlan.actualMinutes / dailyPlan.targetMinutes) * 100))
    : 0;
  const planDateLabel = dailyPlan.date ? formatDateLabel(dailyPlan.date) ?? 'Today' : 'Today';
  const estimatedTotal = taskStats?.total_estimated_minutes ?? 0;
  const estimatedCompleted = taskStats?.completed_minutes ?? 0;
  const estimatedRemaining = Math.max(estimatedTotal - estimatedCompleted, 0);
  const loadPercent = dailyPlan.targetMinutes > 0
    ? Math.min(999, Math.round((estimatedTotal / dailyPlan.targetMinutes) * 100))
    : 0;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="rounded-2xl border border-violet-500/40 bg-gradient-to-br from-violet-900/70 via-purple-900/60 to-slate-900/70 p-6 shadow-[0_20px_40px_rgba(79,70,229,0.25)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-violet-200/70">{planDateLabel}</p>
            <h4 className="mt-1 text-xl font-semibold text-white">Today’s plan</h4>
          </div>
          <span className="text-sm text-white/60">Target {dailyPlan.targetMinutes} min</span>
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-white/50">
            <span>Logged {dailyPlan.actualMinutes} min</span>
            <span>Remaining {remainingMinutes} min</span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/15">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-violet-400 to-purple-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-6">
        <p className="text-xs text-emerald-200/70">Task progress</p>
        <p className="mt-2 text-2xl font-semibold text-emerald-100">
          {taskStats ? `${taskStats.completed}/${taskStats.total}` : '--'}
        </p>
        <p className="mt-1 text-xs text-emerald-200/70">Completed {estimatedCompleted} min</p>
        <p className="mt-2 text-xs text-emerald-100/80">Remaining {estimatedRemaining} min</p>
      </div>
      <div className="rounded-2xl border border-violet-400/30 bg-violet-500/10 p-6">
        <p className="text-xs text-violet-200/80">Reminder</p>
        <p className="mt-2 text-sm text-violet-100">
          Current workload ≈ {loadPercent ? `${loadPercent}%` : '--'} of today’s target. Adjust focus blocks if needed.
        </p>
        <Button
          variant="outline"
          className="mt-4 border-violet-300/40 text-violet-200 hover:bg-violet-500/10"
          onClick={() => void handleGeneratePlan()}
          disabled={isGenerating}
        >
          {isGenerating ? 'Generating…' : 'Rebuild plan'}
        </Button>
      </div>
    </div>
  );
};


const renderTasks = () => {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((key) => (
          <div key={key} className="h-20 animate-pulse rounded-lg border border-white/10 bg-white/5" />
        ))}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-white/15 bg-white/5 p-8 text-center text-white/70">
        <p className="text-lg">No study tasks scheduled for today</p>
        <p className="mt-2 text-sm">Generate a plan or drop the next action from your learning goals.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tasks.map((task) => (
        <div
          key={task.id}
          className={`rounded-xl border bg-white/5 p-5 transition-all duration-200 ${
            task.status === 'completed'
              ? 'border-green-500/30 bg-green-500/10'
              : task.status === 'in_progress'
              ? 'border-blue-500/30 bg-blue-500/10'
              : 'border-white/10 hover:border-violet-400/40 hover:bg-white/10'
          }`}
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-base font-semibold text-white">{task.topic}</h4>
                {renderStatusBadge(task.status)}
              </div>
              <p className="mt-2 text-sm text-white/70">
                Estimated {task.estimatedMinutes} min
                {task.actualMinutes > 0 && ` · Actual ${task.actualMinutes} min`}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {task.status === 'pending' && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={updatingTaskId === task.id}
                  onClick={() => handleStartTask(task.id)}
                  className="border-blue-500/40 text-blue-300 hover:bg-blue-500/10"
                >
                  Start
                </Button>
              )}
              {task.status !== 'completed' && (
                <Button
                  size="sm"
                  disabled={updatingTaskId === task.id}
                  onClick={() => handleCompleteTask(task)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Mark done
                </Button>
              )}
              {task.status !== 'completed' && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={updatingTaskId === task.id}
                  onClick={() => handleSkipTask(task.id)}
                  className="border-amber-400/40 text-amber-200 hover:bg-amber-500/10"
                >
                  Skip today
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                disabled={updatingTaskId === task.id}
                onClick={() => handleSkipToTomorrow(task.id)}
                className="border-indigo-400/40 text-indigo-200 hover:bg-indigo-500/10"
              >
                Move to tomorrow
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};


  return (
    <div className="space-y-6">
      {renderSummary()}

      <div className="rounded-xl border border-white/10 bg-slate-900/40 p-6 backdrop-blur">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-medium text-white">今日任务清单</h3>
          <Button
            variant="outline"
            className="border-white/20 text-white/80 hover:bg-white/10"
            onClick={() => void loadDashboardData()}
            disabled={isLoading}
          >
            重新加载
          </Button>
        </div>
        {renderTasks()}
      </div>

      {learningStats && (
        <div className="bg-slate-900/60 rounded-xl border border-white/10 p-6 backdrop-blur">
          <h3 className="text-lg font-medium text-white mb-4">📊 近期学习观察</h3>
          <div className="space-y-3">
            {learningStats.completionRate < 70 && (
              <div className="flex items-start gap-3 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                <span className="text-orange-400 text-lg">⚠️</span>
                <div>
                  <p className="text-orange-400 font-medium text-sm">完成率偏低</p>
                  <p className="text-white/70 text-xs">试着在高效时段安排核心任务，缩短拖延链。</p>
                </div>
              </div>
            )}
            {learningStats.weeklyProgress < learningStats.weeklyGoal * 0.5 && (
              <div className="flex items-start gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <span className="text-blue-400 text-lg">📅</span>
                <div>
                  <p className="text-blue-400 font-medium text-sm">本周进度待提升</p>
                  <p className="text-white/70 text-xs">计划内的知识点尚未过半，可以安排一段加速时间。</p>
                </div>
              </div>
            )}
            {learningStats.studyDays >= 7 && (
              <div className="flex items-start gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <span className="text-green-400 text-lg">🏆</span>
                <div>
                  <p className="text-green-400 font-medium text-sm">连续学习达成</p>
                  <p className="text-white/70 text-xs">连续学习 {learningStats.studyDays} 天，保持节奏很棒！</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
