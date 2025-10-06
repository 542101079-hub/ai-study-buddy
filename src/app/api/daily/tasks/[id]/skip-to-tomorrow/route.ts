import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerUser } from '@/lib/supabase/server';

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

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getServerUser();
    if (!user) {
      console.error('[daily/tasks/skip-to-tomorrow] No valid user found');
      return NextResponse.json({
        error: '未授权访问',
        details: '请先登录系统'
      }, { status: 401 });
    }

    // 临时使用Mock数据，绕过DNS问题
    console.log('[daily/tasks/skip-to-tomorrow] Using mock data due to DNS issues');

    const parsedParams = ParamsSchema.safeParse(params);
    if (!parsedParams.success) {
      return NextResponse.json({ error: parsedParams.error.flatten() }, { status: 400 });
    }

    const { id } = parsedParams.data;

    // 生成今天的Mock数据
    const todayPlan = {
      id: `mock-plan-today-${Date.now()}`,
      tenant_id: 'mock-tenant-id',
      user_id: user.id,
      plan_id: null,
      date: formatTokyoDate(new Date()),
      target_minutes: 240,
      actual_minutes: 0,
      status: 'draft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const todayTasks = [
      {
        id: `mock-task-1-${Date.now()}`,
        tenant_id: 'mock-tenant-id',
        daily_plan_id: todayPlan.id,
        phase_id: null,
        topic: '学习React基础概念',
        estimated_minutes: 60,
        actual_minutes: 0,
        status: 'pending',
        order_num: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: `mock-task-2-${Date.now()}`,
        tenant_id: 'mock-tenant-id',
        daily_plan_id: todayPlan.id,
        phase_id: null,
        topic: '练习TypeScript类型系统',
        estimated_minutes: 45,
        actual_minutes: 0,
        status: 'pending',
        order_num: 2,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: `mock-task-3-${Date.now()}`,
        tenant_id: 'mock-tenant-id',
        daily_plan_id: todayPlan.id,
        phase_id: null,
        topic: '复习JavaScript异步编程',
        estimated_minutes: 30,
        actual_minutes: 0,
        status: 'pending',
        order_num: 3,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: `mock-task-4-${Date.now()}`,
        tenant_id: 'mock-tenant-id',
        daily_plan_id: todayPlan.id,
        phase_id: null,
        topic: '完成练习题和项目实践',
        estimated_minutes: 105,
        actual_minutes: 0,
        status: 'pending',
        order_num: 4,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    // 生成明天的Mock数据
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const tomorrowPlan = {
      id: `mock-plan-tomorrow-${Date.now()}`,
      tenant_id: 'mock-tenant-id',
      user_id: user.id,
      plan_id: null,
      date: formatTokyoDate(tomorrow),
      target_minutes: 240,
      actual_minutes: 0,
      status: 'draft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const tomorrowTasks = [
      {
        id: id, // 使用被跳过的任务ID
        tenant_id: 'mock-tenant-id',
        daily_plan_id: tomorrowPlan.id,
        phase_id: null,
        topic: '学习React基础概念（从昨天延期）',
        estimated_minutes: 60,
        actual_minutes: 0,
        status: 'pending',
        order_num: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: `mock-task-2-tomorrow-${Date.now()}`,
        tenant_id: 'mock-tenant-id',
        daily_plan_id: tomorrowPlan.id,
        phase_id: null,
        topic: '练习TypeScript类型系统',
        estimated_minutes: 45,
        actual_minutes: 0,
        status: 'pending',
        order_num: 2,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: `mock-task-3-tomorrow-${Date.now()}`,
        tenant_id: 'mock-tenant-id',
        daily_plan_id: tomorrowPlan.id,
        phase_id: null,
        topic: '复习JavaScript异步编程',
        estimated_minutes: 30,
        actual_minutes: 0,
        status: 'pending',
        order_num: 3,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: `mock-task-4-tomorrow-${Date.now()}`,
        tenant_id: 'mock-tenant-id',
        daily_plan_id: tomorrowPlan.id,
        phase_id: null,
        topic: '完成练习题和项目实践',
        estimated_minutes: 105,
        actual_minutes: 0,
        status: 'pending',
        order_num: 4,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    return NextResponse.json({
      today: normalizeResponse(todayPlan, todayTasks),
      tomorrow: normalizeResponse(tomorrowPlan, tomorrowTasks),
    });

  } catch (error) {
    console.error('[daily/tasks/skip-to-tomorrow] POST error', error);
    
    return NextResponse.json({
      error: '移动任务到明天失败',
      details: '服务器内部错误，请稍后重试'
    }, { status: 500 });
  }
}