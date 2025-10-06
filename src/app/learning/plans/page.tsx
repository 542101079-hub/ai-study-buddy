import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { PlanActions } from './plan-actions';
import { supabaseAdmin, getServerSession } from '@/lib/supabase/server';

interface LearningPlanRow {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  created_at: string;
  plan_data: any;
  learning_goals: {
    id: string;
    title: string;
    type: string;
    current_level?: number;
    target_level?: number;
    target_date?: string | null;
  } | null;
}

interface PlanPhase {
  phase_name?: string;
  duration_weeks?: number;
  focus_areas?: string[];
  weekly_tasks?: Array<{
    week?: number;
    tasks?: Array<{
      title?: string;
      type?: string;
      estimated_minutes?: number;
      difficulty?: number;
      description?: string;
      resources?: string[];
    }>;
  }>;
}

interface PlanDataShape {
  plan_overview?: string;
  learning_phases?: PlanPhase[];
  success_metrics?: string[];
  adjustment_triggers?: string[];
}

function parsePlanData(raw: any): PlanDataShape {
  if (!raw) return {};
  if (typeof raw === 'object') return raw as PlanDataShape;
  try {
    return JSON.parse(raw as string) as PlanDataShape;
  } catch (error) {
    console.error('Failed to parse plan_data', error);
    return {};
  }
}

function formatDate(date: string | null | undefined): string {
  if (!date) return '暂无';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return '暂无';
  return parsed.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

const statusMap: Record<string, { label: string; className: string }> = {
  active: { label: '进行中', className: 'text-emerald-300 bg-emerald-500/10 border-emerald-400/40' },
  completed: { label: '已完成', className: 'text-sky-300 bg-sky-500/10 border-sky-400/40' },
  paused: { label: '已暂停', className: 'text-amber-300 bg-amber-500/10 border-amber-400/40' },
  cancelled: { label: '已取消', className: 'text-rose-300 bg-rose-500/10 border-rose-400/40' },
};

export default async function LearningPlansPage({
  searchParams,
}: {
  searchParams?: { planId?: string | string[] };
}) {
  const session = await getServerSession();
  if (!session?.user) {
    redirect('/signin');
  }

  const { data: planRows, error } = await supabaseAdmin
    .from('learning_plans')
    .select(`
      id,
      title,
      description,
      status,
      created_at,
      plan_data,
      learning_goals (
        id,
        title,
        type,
        current_level,
        target_level,
        target_date
      )
    `)
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[learning/plans] failed to load plans', error);
    throw new Error('加载学习计划失败，请稍后重试。');
  }

  const plans: LearningPlanRow[] = (planRows || []).map((plan) => ({
    ...(plan as LearningPlanRow),
    plan_data: parsePlanData(plan.plan_data),
  }));

  const planIdParam = searchParams?.planId;
  const selectedPlanId = Array.isArray(planIdParam)
    ? planIdParam[0]
    : planIdParam || plans[0]?.id || null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
      <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-10">
        <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-violet-200/70">我的学习计划</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">计划详情总览</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/70">
              这里会汇总你为不同学习目标生成的 AI 学习计划，包含阶段拆解、周任务和调整建议，方便随时回顾或复盘。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" asChild className="border-violet-500/40 text-violet-100 hover:bg-violet-500/20">
              <Link href="/dashboard">返回仪表盘</Link>
            </Button>
            <Button asChild className="bg-violet-600 hover:bg-violet-700">
              <Link href="/learning">前往学习空间</Link>
            </Button>
          </div>
        </div>

        {plans.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-white/80">
            <h2 className="text-xl font-semibold">暂未生成学习计划</h2>
            <p className="mt-3 text-sm text-white/70">
              先到学习空间添加学习目标并生成计划吧，生成后会自动保存在这里。
            </p>
            <Button asChild className="mt-6 bg-violet-600 hover:bg-violet-700">
              <Link href="/learning">去生成学习计划</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            {plans.map((plan) => {
              const data = plan.plan_data as PlanDataShape;
              const active = plan.id === selectedPlanId;
              const statusInfo = plan.status ? statusMap[plan.status] : undefined;

              return (
                <section
                  key={plan.id}
                  className={`rounded-2xl border bg-slate-900/70 p-6 shadow-2xl transition-colors ${
                    active
                      ? 'border-violet-500/60 bg-gradient-to-br from-violet-900/40 via-slate-900/70 to-slate-950'
                      : 'border-white/10'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-semibold text-white">{plan.title || 'AI 学习计划'}</h2>
                        {statusInfo && (
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-medium ${statusInfo.className}`}
                          >
                            {statusInfo.label}
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-sm text-white/60">
                        创建时间：{formatDate(plan.created_at)}
                      </p>
                      {plan.learning_goals && (
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-white/70">
                          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                            目标：{plan.learning_goals.title}
                          </span>
                          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                            类型：{plan.learning_goals.type}
                          </span>
                          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                            当前 {plan.learning_goals.current_level ?? '-'} / 目标 {plan.learning_goals.target_level ?? '-'} 级
                          </span>
                          {plan.learning_goals.target_date && (
                            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                              目标日期：{formatDate(plan.learning_goals.target_date)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 text-sm text-white/60">
                      <p>计划 ID：{plan.id}</p>
                      <PlanActions
                        planId={plan.id}
                        planTitle={plan.title || plan.learning_goals?.title || 'AI 学习计划'}
                        isActive={active}
                      />
                    </div>
                  </div>

                  {plan.description && (
                    <div className="mt-4 rounded-lg border border-violet-500/20 bg-violet-500/10 p-4 text-sm text-violet-100">
                      {plan.description}
                    </div>
                  )}

                  {data.plan_overview && (
                    <div className="mt-6">
                      <h3 className="text-lg font-medium text-white">计划概览</h3>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-white/80">
                        {data.plan_overview}
                      </p>
                    </div>
                  )}

                  {Array.isArray(data.learning_phases) && data.learning_phases.length > 0 && (
                    <div className="mt-6 space-y-4">
                      <h3 className="text-lg font-medium text-white">阶段拆解</h3>
                      <div className="space-y-4">
                        {data.learning_phases.map((phase, index) => (
                          <details
                            key={`${plan.id}-phase-${index}`}
                            className="group rounded-xl border border-white/10 bg-white/5 p-4"
                            open={active && index === 0}
                          >
                            <summary className="flex cursor-pointer items-center justify-between gap-2 text-white">
                              <div className="flex items-center gap-3">
                                <span className="rounded-full bg-violet-600/20 px-3 py-1 text-xs font-medium text-violet-100">
                                  阶段 {index + 1}
                                </span>
                                <span className="text-base font-semibold">{phase.phase_name || '学习阶段'}</span>
                              </div>
                              {phase.duration_weeks && (
                                <span className="text-xs text-white/60">周期：{phase.duration_weeks} 周</span>
                              )}
                            </summary>
                            <div className="mt-4 space-y-4 text-sm text-white/80">
                              {phase.focus_areas && phase.focus_areas.length > 0 && (
                                <div>
                                  <p className="text-xs uppercase tracking-wide text-violet-200/70">重点关注</p>
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {phase.focus_areas.map((area, i) => (
                                      <span
                                        key={`${plan.id}-phase-${index}-focus-${i}`}
                                        className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs text-violet-100"
                                      >
                                        {area}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {phase.weekly_tasks && phase.weekly_tasks.length > 0 && (
                                <div className="space-y-3">
                                  {phase.weekly_tasks.map((week, weekIndex) => (
                                    <div
                                      key={`${plan.id}-phase-${index}-week-${weekIndex}`}
                                      className="rounded-lg border border-white/10 bg-slate-900/60 p-4"
                                    >
                                      <h4 className="text-sm font-semibold text-white">
                                        第 {week.week ?? weekIndex + 1} 周学习任务
                                      </h4>
                                      <div className="mt-3 space-y-3">
                                        {week.tasks?.map((task, taskIndex) => (
                                          <div
                                            key={`${plan.id}-phase-${index}-week-${weekIndex}-task-${taskIndex}`}
                                            className="rounded-md border border-white/10 bg-white/5 p-3"
                                          >
                                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-white/70">
                                              <span className="font-medium text-white">{task.title || '学习任务'}</span>
                                              <div className="flex flex-wrap items-center gap-2">
                                                {task.type && (
                                                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
                                                    类型：{task.type}
                                                  </span>
                                                )}
                                                {typeof task.difficulty === 'number' && (
                                                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
                                                    难度：{task.difficulty}/10
                                                  </span>
                                                )}
                                                {typeof task.estimated_minutes === 'number' && (
                                                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
                                                    预计 {task.estimated_minutes} 分钟
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                            {task.description && (
                                              <p className="mt-2 text-xs leading-relaxed text-white/70">
                                                {task.description}
                                              </p>
                                            )}
                                            {task.resources && task.resources.length > 0 && (
                                              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-white/60">
                                                {task.resources.map((resource, resourceIdx) => (
                                                  <li key={`${plan.id}-phase-${index}-week-${weekIndex}-task-${taskIndex}-resource-${resourceIdx}`}>
                                                    {resource}
                                                  </li>
                                                ))}
                                              </ul>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </details>
                        ))}
                      </div>
                    </div>
                  )}

                  {(data.success_metrics?.length || data.adjustment_triggers?.length) && (
                    <div className="mt-6 grid gap-4 md:grid-cols-2">
                      {data.success_metrics && data.success_metrics.length > 0 && (
                        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                          <h3 className="text-sm font-semibold text-emerald-200">成功指标</h3>
                          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-emerald-100/80">
                            {data.success_metrics.map((metric, i) => (
                              <li key={`${plan.id}-metric-${i}`}>{metric}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {data.adjustment_triggers && data.adjustment_triggers.length > 0 && (
                        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
                          <h3 className="text-sm font-semibold text-amber-200">调整建议</h3>
                          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-amber-100/80">
                            {data.adjustment_triggers.map((trigger, i) => (
                              <li key={`${plan.id}-trigger-${i}`}>{trigger}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

