import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerUser, supabaseAdmin } from '@/lib/supabase/server';

const TOKYO_OFFSET_MS = 9 * 60 * 60 * 1000;
const ParamsSchema = z.object({ id: z.string() });

function formatTokyoDate(date: Date): string {
  const tokyo = new Date(date.getTime() + TOKYO_OFFSET_MS);
  const year = tokyo.getUTCFullYear();
  const month = `${tokyo.getUTCMonth() + 1}`.padStart(2, '0');
  const day = `${tokyo.getUTCDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeTask(task: any) {
  if (!task) return null;
  return {
    id: task.id,
    topic: task.topic ?? task.title ?? '',
    estimatedMinutes: Number(task.estimatedMinutes ?? task.estimated_minutes ?? 0),
    actualMinutes: Number(task.actualMinutes ?? task.actual_minutes ?? 0),
    status: (task.status ?? 'pending') as 'pending' | 'in_progress' | 'completed' | 'skipped',
    orderNum: task.orderNum ?? task.order_num ?? null,
  };
}

function normalizePlan(plan: any) {
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

function normalizeResponse(plan: any, tasks: any[]) {
  return {
    plan: normalizePlan(plan),
    tasks: tasks.map(normalizeTask).filter(Boolean),
  };
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getServerUser();
    if (!user) {
      console.error('[daily/tasks/skip-to-tomorrow] No valid user found');
      return NextResponse.json({
        error: '未授权访问',
        details: '请先登录系统'
      }, { status: 401 });
    }

    const resolvedParams = await params;
    const parsedParams = ParamsSchema.safeParse(resolvedParams);
    if (!parsedParams.success) {
      return NextResponse.json({ error: parsedParams.error.flatten() }, { status: 400 });
    }

    const { id } = parsedParams.data;

    // 查找当前任务
    const { data: task, error: taskError } = await supabaseAdmin
      .from('daily_tasks')
      .select('*')
      .eq('id', id)
      .single();

    if (taskError || !task) {
      console.error('[daily/tasks] Task not found:', taskError);
      return NextResponse.json({
        error: '任务不存在',
        details: '找不到指定的任务'
      }, { status: 404 });
    }

    // 获取当前计划
    const { data: currentPlan, error: currentPlanError } = await supabaseAdmin
      .from('daily_plans')
      .select('*')
      .eq('id', task.daily_plan_id)
      .single();

    if (currentPlanError || !currentPlan) {
      console.error('[daily/tasks] Plan not found:', currentPlanError);
      return NextResponse.json({
        error: '计划不存在',
        details: '找不到关联的每日计划'
      }, { status: 404 });
    }

    // 计算明天的日期
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDate = formatTokyoDate(tomorrow);

    // 查找或创建明天的计划
    let { data: tomorrowPlan, error: tomorrowPlanError } = await supabaseAdmin
      .from('daily_plans')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', tomorrowDate)
      .limit(1)
      .single();

    if (tomorrowPlanError || !tomorrowPlan) {
      const { data: newPlan, error: insertError } = await supabaseAdmin
        .from('daily_plans')
        .insert({
          user_id: user.id,
          tenant_id: currentPlan.tenant_id,
          date: tomorrowDate,
          target_minutes: currentPlan.target_minutes,
          actual_minutes: 0,
          status: 'draft',
        })
        .select()
        .single();

      if (insertError) {
        console.error('[daily/tasks] Error creating tomorrow plan:', insertError);
        return NextResponse.json({
          error: '创建明天计划失败',
          details: insertError.message
        }, { status: 500 });
      }

      tomorrowPlan = newPlan;
    }

    // 将任务移动到明天的计划
    const { error: updateTaskError } = await supabaseAdmin
      .from('daily_tasks')
      .update({
        daily_plan_id: tomorrowPlan.id,
        status: 'pending',
        actual_minutes: 0,
        order_num: 1, // 设置为第一个任务
      })
      .eq('id', id);

    if (updateTaskError) {
      console.error('[daily/tasks] Error moving task to tomorrow:', updateTaskError);
      return NextResponse.json({
        error: '移动任务到明天失败',
        details: updateTaskError.message
      }, { status: 500 });
    }

    // 获取更新后的今天计划的所有任务
    const { data: todayTasks, error: todayTasksError } = await supabaseAdmin
      .from('daily_tasks')
      .select('*')
      .eq('daily_plan_id', currentPlan.id)
      .order('order_num');

    if (todayTasksError) {
      console.error('[daily/tasks] Error fetching today tasks:', todayTasksError);
      return NextResponse.json({
        error: '获取今日任务失败',
        details: todayTasksError.message
      }, { status: 500 });
    }

    // 获取明天的计划的所有任务
    const { data: tomorrowTasks, error: tomorrowTasksError } = await supabaseAdmin
      .from('daily_tasks')
      .select('*')
      .eq('daily_plan_id', tomorrowPlan.id)
      .order('order_num');

    if (tomorrowTasksError) {
      console.error('[daily/tasks] Error fetching tomorrow tasks:', tomorrowTasksError);
      return NextResponse.json({
        error: '获取明天任务失败',
        details: tomorrowTasksError.message
      }, { status: 500 });
    }

    return NextResponse.json({
      today: normalizeResponse(currentPlan, todayTasks || []),
      tomorrow: normalizeResponse(tomorrowPlan, tomorrowTasks || []),
    });

  } catch (error) {
    console.error('[daily/tasks/skip-to-tomorrow] POST error', error);

    return NextResponse.json({
      error: '移动任务到明天失败',
      details: '服务器内部错误，请稍后重试'
    }, { status: 500 });
  }
}