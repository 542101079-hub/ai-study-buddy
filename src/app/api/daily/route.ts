import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerUser } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/server';

const DEFAULT_DAILY_MINUTES = 240;
const TOKYO_OFFSET_MS = 9 * 60 * 60 * 1000;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const querySchema = z.object({
  date: z.string().trim().regex(DATE_REGEX).optional(),
  dailyMinutes: z
    .union([z.number(), z.string()])
    .transform((value) => Number(value))
    .refine((value) => Number.isFinite(value) && value > 0, 'dailyMinutes must be a positive number')
    .optional(),
});

function formatTokyoDate(date: Date): string {
  const tokyo = new Date(date.getTime() + TOKYO_OFFSET_MS);
  const year = tokyo.getUTCFullYear();
  const month = `${tokyo.getUTCMonth() + 1}`.padStart(2, '0');
  const day = `${tokyo.getUTCDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}


function normalizeTask(task: any) {
  if (!task) {
    return null;
  }

  return {
    id: task.id,
    topic: task.topic ?? task.title ?? '',
    estimatedMinutes: Number(task.estimatedMinutes ?? task.estimated_minutes ?? 0),
    actualMinutes: Number(task.actualMinutes ?? task.actual_minutes ?? 0),
    status: (task.status ?? 'pending') as 'pending' | 'in_progress' | 'completed' | 'skipped',
    orderNum: Number(task.orderNum ?? task.order_num ?? 0),
  };
}

function normalizePlan(plan: any) {
  if (!plan) {
    return null;
  }

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

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) {
      console.error('[daily] No valid user found');
      return NextResponse.json({
        error: '未授权访问',
        details: '请先登录系统'
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse(Object.fromEntries(searchParams));

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { date, dailyMinutes } = parsed.data;
    const targetDate = date ?? formatTokyoDate(new Date());

    // 使用Supabase REST API查询当天的每日计划
    const { data: existingPlans, error: planError } = await supabaseAdmin
      .from('daily_plans')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', targetDate)
      .limit(1);

    if (planError) {
      console.error('[daily] Error querying daily plans:', planError);
      return NextResponse.json({
        error: '查询每日计划失败',
        details: planError.message
      }, { status: 500 });
    }

    let plan = existingPlans?.[0];

    // 如果没有现有计划，创建一个新的
    if (!plan) {
      // 获取用户的tenant_id
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        console.error('[daily] Error fetching user profile:', profileError);
        return NextResponse.json({
          error: '获取用户信息失败',
          details: '无法获取用户的租户信息'
        }, { status: 500 });
      }

      const { data: newPlan, error: insertError } = await supabaseAdmin
        .from('daily_plans')
        .insert({
          user_id: user.id,
          tenant_id: profile.tenant_id,
          date: targetDate,
          target_minutes: dailyMinutes ?? DEFAULT_DAILY_MINUTES,
          actual_minutes: 0,
          status: 'draft',
        })
        .select()
        .single();
      
      if (insertError) {
        console.error('[daily] Error creating daily plan:', insertError);
        return NextResponse.json({
          error: '创建每日计划失败',
          details: insertError.message
        }, { status: 500 });
      }
      
      plan = newPlan;
    }

    // 查询该计划的所有任务
    const { data: tasks, error: tasksError } = await supabaseAdmin
      .from('daily_tasks')
      .select('*')
      .eq('daily_plan_id', plan.id)
      .order('order_num');

    if (tasksError) {
      console.error('[daily] Error querying daily tasks:', tasksError);
      return NextResponse.json({
        error: '查询每日任务失败',
        details: tasksError.message
      }, { status: 500 });
    }

    return NextResponse.json(normalizeResponse(plan, tasks || []));

  } catch (error) {
    console.error('[daily] GET error', error);
    
    return NextResponse.json({
      error: '获取学习计划失败',
      details: '服务器内部错误，请稍后重试'
    }, { status: 500 });
  }
}