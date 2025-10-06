
import { NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';

import { getServerSession, supabaseAdmin } from '@/lib/supabase/server';
import { generateDailyPlan } from '@/lib/planner/daily';

const TOKYO_OFFSET_MS = 9 * 60 * 60 * 1000;
const ParamsSchema = z.object({ id: z.string().uuid('Invalid task id') });

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

async function resolveTenantId(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('tenant_id')
    .eq('id', userId)
    .single();

  if (error) {
    throw error;
  }

  return data?.tenant_id ?? null;
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

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const parsedParams = ParamsSchema.safeParse(params);
    if (!parsedParams.success) {
      return NextResponse.json({ error: parsedParams.error.flatten() }, { status: 400 });
    }

    const tenantId = await resolveTenantId(session.user.id);
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant not found for user' }, { status: 400 });
    }

    const { data: taskRecord, error: fetchError } = await supabaseAdmin
      .from('daily_tasks')
      .select('id, tenant_id, daily_plan_id, topic, estimated_minutes, actual_minutes, daily_plans!inner(id, user_id, tenant_id, date)')
      .eq('id', parsedParams.data.id)
      .single();

    if (fetchError || !taskRecord) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    if (taskRecord.daily_plans.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const currentDate = taskRecord.daily_plans.date ? new Date(taskRecord.daily_plans.date) : new Date();
    const tomorrow = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowDate = formatTokyoDate(tomorrow);

    const { data: tomorrowPlan } = await supabaseAdmin
      .from('daily_plans')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('tenant_id', tenantId)
      .eq('date', tomorrowDate)
      .maybeSingle();

    const planResult = tomorrowPlan
      ? null
      : await generateDailyPlan({
          userId: session.user.id,
          tenantId,
          planId: null,
          date: tomorrowDate,
          dailyMinutes: taskRecord.estimated_minutes ?? 60,
        });

    const targetPlanId = tomorrowPlan?.id ?? planResult?.plan.id;

    if (!targetPlanId) {
      return NextResponse.json({ error: 'Failed to prepare tomorrow plan' }, { status: 500 });
    }

    const { data: orderRows } = await supabaseAdmin
      .from('daily_tasks')
      .select('order_num')
      .eq('daily_plan_id', targetPlanId)
      .order('order_num', { ascending: false })
      .limit(1);

    const nextOrder = (orderRows?.[0]?.order_num ?? 0) + 1;

    const { data: movedTask, error: updateError } = await supabaseAdmin
      .from('daily_tasks')
      .update({
        daily_plan_id: targetPlanId,
        tenant_id: tenantId,
        status: 'pending',
        actual_minutes: 0,
        order_num: nextOrder,
        completed_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', parsedParams.data.id)
      .select()
      .single();

    if (updateError || !movedTask) {
      console.error('[daily/tasks skip] update error', updateError);
      return NextResponse.json({ error: 'Failed to move task' }, { status: 500 });
    }

    await recalcActualMinutes(taskRecord.daily_plan_id, session.user.id);
    await recalcActualMinutes(targetPlanId, session.user.id);

    const { data: refreshedTomorrow } = await supabaseAdmin
      .from('daily_plans')
      .select('*, daily_tasks(*)')
      .eq('id', targetPlanId)
      .maybeSingle();

    const { data: refreshedToday } = await supabaseAdmin
      .from('daily_plans')
      .select('*, daily_tasks(*)')
      .eq('id', taskRecord.daily_plan_id)
      .maybeSingle();

    return NextResponse.json({
      movedTask: normalizeTask(movedTask),
      today: normalizeResponse(refreshedToday, refreshedToday?.daily_tasks ?? []),
      tomorrow: normalizeResponse(refreshedTomorrow, refreshedTomorrow?.daily_tasks ?? []),
    });
  } catch (error) {
    console.error('[daily/tasks skip-to-tomorrow] error', error);
    return NextResponse.json({ error: 'Failed to move task to tomorrow' }, { status: 500 });
  }
}
