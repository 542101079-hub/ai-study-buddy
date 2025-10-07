import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerUser } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/server';

const VALID_STATUSES = ['pending', 'in_progress', 'completed', 'skipped'] as const;
const StatusEnum = z.enum(VALID_STATUSES);

const BodySchema = z
  .object({
    status: StatusEnum.optional(),
    actualMinutes: z
      .union([z.string(), z.number()])
      .transform((value) => Number(value))
      .refine((value) => Number.isFinite(value) && value >= 0, 'actualMinutes must be a non-negative number')
      .optional(),
  })
  .refine((data) => data.status !== undefined || data.actualMinutes !== undefined, {
    message: 'At least one of status or actualMinutes is required',
    path: ['status'],
  });

const ParamsSchema = z.object({ id: z.string() });

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


export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getServerUser();
    if (!user) {
      console.error('[daily/tasks] No valid user found');
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
    const json = await request.json();
    const parsedBody = BodySchema.safeParse(json);

    if (!parsedBody.success) {
      return NextResponse.json({ error: parsedBody.error.flatten() }, { status: 400 });
    }

    const { status, actualMinutes } = parsedBody.data;

    // 查找任务
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

    // 更新任务状态
    const taskRow = task as any;
    const updateData: any = {};
    if (status !== undefined) {
      updateData.status = status;
    }
    if (actualMinutes !== undefined) {
      updateData.actual_minutes = actualMinutes;
    }

    const { error: updateError } = await (supabaseAdmin.from('daily_tasks') as any)
      .update(updateData)
      .eq('id', id);

    if (updateError) {
      console.error('[daily/tasks] Error updating task:', updateError);
      return NextResponse.json({
        error: '更新任务失败',
        details: updateError.message
      }, { status: 500 });
    }

    // 获取更新后的计划信息
    const { data: plan, error: planError } = await supabaseAdmin
      .from('daily_plans')
      .select('*')
      .eq('id', taskRow?.daily_plan_id)
      .single();

    if (planError) {
      console.error('[daily/tasks] Error fetching plan:', planError);
      return NextResponse.json({
        error: '获取计划信息失败',
        details: planError.message
      }, { status: 500 });
    }

    // 获取该计划的所有任务
    const { data: allTasks, error: tasksError } = await supabaseAdmin
      .from('daily_tasks')
      .select('*')
      .eq('daily_plan_id', taskRow?.daily_plan_id)
      .order('order_num');

    if (tasksError) {
      console.error('[daily/tasks] Error fetching tasks:', tasksError);
      return NextResponse.json({
        error: '获取任务列表失败',
        details: tasksError.message
      }, { status: 500 });
    }

    const normalized = normalizeResponse(plan, allTasks || []);
    return NextResponse.json(normalized);

  } catch (error) {
    console.error('[daily/tasks] PATCH error', error);
    
    return NextResponse.json({
      error: '更新任务状态失败',
      details: '服务器内部错误，请稍后重试'
    }, { status: 500 });
  }
}
