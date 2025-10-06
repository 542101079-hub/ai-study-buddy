"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface LearningTask {
  id: string;
  title: string;
  description: string | null;
  type: string;
  difficulty: number;
  estimated_minutes: number;
  actual_minutes?: number | null;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  due_date: string;
  learning_goals?: {
    id: string;
    title: string;
    type: string;
  } | null;
  learning_plans?: {
    id: string;
    title: string;
  } | null;
}

interface TaskStats {
  total: number;
  completed: number;
  pending: number;
  in_progress: number;
  total_estimated_minutes: number;
  completed_minutes: number;
}

const TASK_TYPE_OPTIONS = [
  { value: 'study', label: '系统学习', icon: '📘' },
  { value: 'reading', label: '阅读材料', icon: '📖' },
  { value: 'practice', label: '练习巩固', icon: '📝' },
  { value: 'coding', label: '编码实战', icon: '💻' },
  { value: 'project', label: '项目推进', icon: '🧩' },
  { value: 'review', label: '复盘总结', icon: '🔁' },
  { value: 'quiz', label: '测验自检', icon: '❓' },
];

const TIME_BLOCK_OPTIONS = [
  { value: 'flexible', label: '灵活安排' },
  { value: 'morning', label: '上午优先' },
  { value: 'afternoon', label: '下午执行' },
  { value: 'evening', label: '晚上冲刺' },
];

const STATUS_META: Record<LearningTask['status'], { label: string; badge: string }> = {
  pending: {
    label: '待开始',
    badge: 'border-white/15 text-white/70 bg-white/5',
  },
  in_progress: {
    label: '进行中',
    badge: 'border-blue-400/40 text-blue-200 bg-blue-500/10',
  },
  completed: {
    label: '已完成',
    badge: 'border-emerald-400/40 text-emerald-200 bg-emerald-500/10',
  },
  skipped: {
    label: '已跳过',
    badge: 'border-amber-400/40 text-amber-200 bg-amber-500/10',
  },
};

const difficultyLabel = (value: number) => {
  if (value <= 2) return '轻松';
  if (value <= 4) return '适中';
  if (value <= 6) return '挑战';
  if (value <= 8) return '进阶';
  return '硬核';
};

const formatTime = (iso: string) => {
  const date = new Date(iso);
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

export function TodayPlan() {
  const [tasks, setTasks] = useState<LearningTask[]>([]);
  const [stats, setStats] = useState<TaskStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    type: 'study',
    estimated_minutes: 45,
    difficulty: 5,
    time_block: 'flexible',
  });

  const loadTodayPlan = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/learning/tasks/today');
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const data = await response.json();
      setTasks(data.tasks || []);
      setStats(data.stats || null);
    } catch (err) {
      console.error('Failed to load today plan:', err);
      setError('加载今日学习计划失败，请稍后再试。');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTodayPlan();
  }, [loadTodayPlan]);

  const handleStatusUpdate = useCallback(
    async (task: LearningTask, status: LearningTask['status'], actualMinutes?: number) => {
      try {
        const response = await fetch('/api/learning/tasks/today', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            taskId: task.id,
            status,
            actual_minutes: actualMinutes,
          }),
        });

        if (!response.ok) {
          throw new Error(await response.text());
        }

        const data = await response.json();
        setTasks(data.tasks || []);
        setStats(data.stats || null);
      } catch (err) {
        console.error('Failed to update task:', err);
        alert('更新任务状态失败，请稍后再试。');
      }
    },
    [],
  );

  const handleDeleteTask = useCallback(
    async (task: LearningTask) => {
      if (!confirm(`确定要删除任务「${task.title}」吗？`)) {
        return;
      }
      try {
        const response = await fetch(`/api/learning/tasks/${task.id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error(await response.text());
        }

        await loadTodayPlan();
      } catch (err) {
        console.error('Failed to delete task:', err);
        alert('删除任务失败，请稍后再试。');
      }
    },
    [loadTodayPlan],
  );

  const handleCreateTask = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!form.title.trim()) {
        setFormError('请输入任务标题');
        return;
      }

      setCreating(true);
      setFormError(null);

      try {
        const response = await fetch('/api/learning/tasks/today', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: form.title,
            description: form.description || undefined,
            type: form.type,
            estimated_minutes: Number(form.estimated_minutes) || 30,
            difficulty: Number(form.difficulty) || 5,
            time_block: form.time_block,
          }),
        });

        if (!response.ok) {
          const errorMessage = await response.text();
          throw new Error(errorMessage);
        }

        const data = await response.json();
        setTasks(data.tasks || []);
        setStats(data.stats || null);
        setForm({
          title: '',
          description: '',
          type: form.type,
          estimated_minutes: form.estimated_minutes,
          difficulty: form.difficulty,
          time_block: form.time_block,
        });
      } catch (err) {
        console.error('Failed to create task:', err);
        setFormError('创建任务失败，请稍后再试。');
      } finally {
        setCreating(false);
      }
    },
    [form],
  );

  const totalHours = useMemo(() => {
    if (!stats) return 0;
    return Math.round((stats.total_estimated_minutes / 60) * 10) / 10;
  }, [stats]);

  const completedHours = useMemo(() => {
    if (!stats) return 0;
    return Math.round((stats.completed_minutes / 60) * 10) / 10;
  }, [stats]);

  return (
    <div className="space-y-8">
      {/* 概览 */}
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur">
          <p className="text-xs text-white/50 mb-1">今日任务</p>
          <p className="text-2xl font-semibold text-white">
            {stats ? stats.total : '--'}
          </p>
          <p className="text-xs text-white/40 mt-2">
            已完成 {stats ? stats.completed : '--'} 个 · 进行中 {stats ? stats.in_progress : '--'} 个
          </p>
        </div>
        <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4 backdrop-blur">
          <p className="text-xs text-emerald-200/70 mb-1">学习投入</p>
          <p className="text-2xl font-semibold text-emerald-100">{completedHours}h</p>
          <p className="text-xs text-emerald-200/80 mt-2">预估耗时 {totalHours}h</p>
        </div>
        <div className="rounded-xl border border-violet-400/30 bg-violet-500/10 p-4 backdrop-blur">
          <p className="text-xs text-violet-200/80 mb-1">执行状态</p>
          <p className="text-2xl font-semibold text-violet-100">
            {stats && stats.total > 0
              ? `${Math.round((stats.completed / stats.total) * 100)}%`
              : '0%'}
          </p>
          <p className="text-xs text-violet-200/70 mt-2">保持节奏，完成今日计划</p>
        </div>
      </section>

      {/* 新建任务 */}
      <section className="rounded-2xl border border-white/10 bg-slate-900/40 p-6 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">快速补充今日任务</h2>
            <p className="text-sm text-white/60">不到 1 分钟，为今天加上一条明确可执行的行动。</p>
          </div>
        </div>

        <form onSubmit={handleCreateTask} className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label className="text-sm text-white/80">任务标题</Label>
            <Input
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="例如：完成 C 语言指针练习题"
              className="mt-1 bg-slate-800/70 border-white/10 text-white placeholder:text-white/30"
            />
          </div>

          <div className="md:col-span-2">
            <Label className="text-sm text-white/80">说明（可选）</Label>
            <textarea
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              rows={3}
              className="mt-1 w-full rounded-md border border-white/10 bg-slate-800/70 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/30"
              placeholder="写下关键步骤或资源链接，帮助自己更快进入状态"
            />
          </div>

          <div>
            <Label className="text-sm text-white/80">任务类型</Label>
            <select
              value={form.type}
              onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))}
              className="mt-1 w-full rounded-md border border-white/10 bg-slate-800/70 px-3 py-2 text-sm text-white focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/30"
            >
              {TASK_TYPE_OPTIONS.map((option) => (
                <option value={option.value} key={option.value}>
                  {option.icon} {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label className="text-sm text-white/80">执行时段</Label>
            <select
              value={form.time_block}
              onChange={(event) => setForm((prev) => ({ ...prev, time_block: event.target.value }))}
              className="mt-1 w-full rounded-md border border-white/10 bg-slate-800/70 px-3 py-2 text-sm text-white focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/30"
            >
              {TIME_BLOCK_OPTIONS.map((option) => (
                <option value={option.value} key={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label className="text-sm text-white/80">预估耗时（分钟）</Label>
            <Input
              type="number"
              min={5}
              max={480}
              value={form.estimated_minutes}
              onChange={(event) => setForm((prev) => ({ ...prev, estimated_minutes: Number(event.target.value) }))}
              className="mt-1 bg-slate-800/70 border-white/10 text-white placeholder:text-white/30"
            />
          </div>

          <div>
            <Label className="text-sm text-white/80">难度（1-10）</Label>
            <Input
              type="number"
              min={1}
              max={10}
              value={form.difficulty}
              onChange={(event) => setForm((prev) => ({ ...prev, difficulty: Number(event.target.value) }))}
              className="mt-1 bg-slate-800/70 border-white/10 text-white placeholder:text-white/30"
            />
          </div>

          <div className="md:col-span-2 flex flex-col gap-2">
            {formError && (
              <p className="text-sm text-amber-300">{formError}</p>
            )}
            <Button
              type="submit"
              disabled={creating}
              className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl"
            >
              {creating ? '创建中...' : '添加到今日计划'}
            </Button>
          </div>
        </form>
      </section>

      {/* 今日任务列表 */}
      <section className="rounded-2xl border border-white/10 bg-slate-900/40 p-6 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold text-white">今日执行清单</h2>
          <Button
            variant="outline"
            className="border-white/15 text-white/80 hover:bg-white/10"
            onClick={loadTodayPlan}
          >
            刷新
          </Button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((key) => (
              <div
                key={key}
                className="h-20 animate-pulse rounded-lg border border-white/5 bg-white/5"
              />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-lg border border-amber-400/40 bg-amber-500/10 p-4 text-sm text-amber-100">
            {error}
          </div>
        ) : tasks.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/10 bg-white/5 p-8 text-center text-white/60">
            <p className="text-lg">今天还没有任务安排</p>
            <p className="mt-2 text-sm">使用上方表单添加一条任务，或前往 AI 学习计划生成器。</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tasks.map((task) => {
              const typeMeta = TASK_TYPE_OPTIONS.find((option) => option.value === task.type);
              const statusMeta = STATUS_META[task.status];
              return (
                <div
                  key={task.id}
                  className="rounded-xl border border-white/10 bg-white/5 p-5 transition-all duration-200 hover:border-violet-400/40 hover:bg-white/10"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xl">
                          {typeMeta?.icon || '🎯'}
                        </span>
                        <h3 className="text-base font-semibold text-white">
                          {task.title}
                        </h3>
                        <span className={cn('rounded-full border px-3 py-0.5 text-xs', statusMeta.badge)}>
                          {statusMeta.label}
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-white/70">
                          难度 {task.difficulty}/10 · {difficultyLabel(task.difficulty)}
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-white/70">
                          预计 {task.estimated_minutes} 分钟
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-white/60">
                          {formatTime(task.due_date)}
                        </span>
                      </div>

                      {task.description && (
                        <p className="text-sm text-white/70">
                          {task.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-3 text-xs text-white/50">
                        {task.learning_goals?.title && (
                          <span>🎯 关联目标：{task.learning_goals.title}</span>
                        )}
                        {task.learning_plans?.title && (
                          <span>🗂 来源计划：{task.learning_plans.title}</span>
                        )}
                        {task.actual_minutes && (
                          <span>⏱ 实际耗时：{task.actual_minutes} 分钟</span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-stretch gap-2 min-w-[160px]">
                      {task.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                            onClick={() => handleStatusUpdate(task, 'in_progress')}
                          >
                            开始执行
                          </Button>
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => handleStatusUpdate(task, 'completed', task.estimated_minutes)}
                          >
                            标记完成
                          </Button>
                        </>
                      )}

                      {task.status === 'in_progress' && (
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => handleStatusUpdate(task, 'completed', task.estimated_minutes)}
                        >
                          完成任务
                        </Button>
                      )}

                      {task.status !== 'completed' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-amber-400/40 text-amber-200 hover:bg-amber-500/10"
                          onClick={() => handleStatusUpdate(task, 'skipped')}
                        >
                          暂时跳过
                        </Button>
                      )}

                      {task.status !== 'pending' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-white/15 text-white/70 hover:bg-white/10"
                          onClick={() => handleStatusUpdate(task, 'pending')}
                        >
                          恢复为待开始
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-500/40 text-red-300 hover:bg-red-500/10"
                        onClick={() => handleDeleteTask(task)}
                      >
                        删除任务
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
