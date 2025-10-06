
import { NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';

import { getServerSession, supabaseAdmin } from '@/lib/supabase/server';

const VALID_STATUSES = ['pending', 'in_progress', 'completed', 'skipped'] as const;
const StatusEnum = z.enum(VALID_STATUSES);

const TOKYO_OFFSET_MS = 9 * 60 * 60 * 1000;

function formatTokyoDate(date: Date): string {
  const tokyo = new Date(date.getTime() + TOKYO_OFFSET_MS);
  const year = tokyo.getUTCFullYear();
  const month = `${tokyo.getUTCMonth() + 1}`.padStart(2, '0');
  const day = `${tokyo.getUTCDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

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

const ParamsSchema = z.object({ id: z.string().uuid('Invalid task id') });

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
  const dateValue = plan.date instanceof Date ? formatTokyoDate(plan.date) : plan.date;
  return {
    id: plan.id,
    date: dateValue ?? null,
    targetMinutes: Number(plan.targetMinutes ?? plan.target_minutes ?? 0),
    actualMinutes: Number(plan.actualMinutes ?? plan.actual_minutes ?? 0),
    status: plan.status ?? 'draft',
    createdAt: plan.createdAt ?? plan.created_at ?? null,
    updatedAt: plan.updatedAt ?? plan.updated_at ?? null,
  };
}

function normalizeResponse(plan: any, tasks: any[] = []) {
  return {
    plan: normalizePlan(plan),
    tasks: tasks.map(normalizeTask).filter(Boolean),
  };
}

async function recalcActualMinutes(planId: string, userId: string) {
  const { data } = await supabaseAdmin
    .from('daily_tasks')
    .select('sum(actual_minutes) as total')
    .eq('daily_plan_id', planId)
    .eq('status', 'completed')
    .single();

  const totalMinutes = Number(data?.total ?? 0);

  await supabaseAdmin
    .from('daily_plans')
    .update({ actual_minutes: totalMinutes, updated_at: new Date().toISOString() })
    .eq('id', planId)
    .eq('user_id', userId);
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const parsedParams = ParamsSchema.safeParse(params);
    if (!parsedParams.success) {
      return NextResponse.json({ error: parsedParams.error.flatten() }, { status: 400 });
    }

    const payload = await request.json().catch(() => ({}));
    const parsedBody = BodySchema.safeParse(payload);

    if (!parsedBody.success) {
      return NextResponse.json({ error: parsedBody.error.flatten() }, { status: 400 });
    }

    const { data: taskRecord, error: fetchError } = await supabaseAdmin
      .from('daily_tasks')
      .select('id, tenant_id, daily_plan_id, estimated_minutes, actual_minutes, status, daily_plans!inner(id, user_id, tenant_id)')
      .eq('id', parsedParams.data.id)
      .single();

    if (fetchError || !taskRecord) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    if (taskRecord.daily_plans.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (parsedBody.data.status) {
      updates.status = parsedBody.data.status;
      if (parsedBody.data.status === 'completed') {
        updates.completed_at = new Date().toISOString();
      }
    }

    if (parsedBody.data.actualMinutes !== undefined) {
      updates.actual_minutes = Math.round(parsedBody.data.actualMinutes);
    } else if (parsedBody.data.status === 'completed') {
      updates.actual_minutes = taskRecord.actual_minutes ?? taskRecord.estimated_minutes ?? 0;
    }

    const { data: updatedTask, error: updateError } = await supabaseAdmin
      .from('daily_tasks')
      .update(updates)
      .eq('id', parsedParams.data.id)
      .select()
      .single();

    if (updateError || !updatedTask) {
      console.error('[daily/tasks] update error', updateError);
      return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
    }

    await recalcActualMinutes(taskRecord.daily_plan_id, session.user.id);

    const { data: refreshedPlan } = await supabaseAdmin
      .from('daily_plans')
      .select('*, daily_tasks(*)')
      .eq('id', taskRecord.daily_plan_id)
      .maybeSingle();

    const normalized = normalizeResponse(refreshedPlan, refreshedPlan?.daily_tasks ?? []);

    return NextResponse.json({
      task: normalizeTask(updatedTask),
      plan: normalized.plan,
      tasks: normalized.tasks,
    });
  } catch (error) {
    console.error('[daily/tasks:id] PATCH error', error);
    return NextResponse.json({ error: 'Failed to update daily task' }, { status: 500 });
  }
}
