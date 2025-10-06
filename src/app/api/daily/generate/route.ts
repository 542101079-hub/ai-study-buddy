import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerUser, supabaseAdmin } from "@/lib/supabase/server";

const DEFAULT_DAILY_MINUTES = 240;
const TOKYO_OFFSET_MS = 9 * 60 * 60 * 1000;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const bodySchema = z.object({
  planId: z.string().trim().min(1).optional(),
  date: z.string().trim().regex(DATE_REGEX).optional(),
  dailyMinutes: z
    .union([z.number(), z.string()])
    .transform((value) => Number(value))
    .refine((value) => Number.isFinite(value) && value > 0, "dailyMinutes must be a positive number")
    .optional(),
});

function formatTokyoDate(date: Date): string {
  const tokyo = new Date(date.getTime() + TOKYO_OFFSET_MS);
  const year = tokyo.getUTCFullYear();
  const month = `${tokyo.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${tokyo.getUTCDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}


function normalizeTask(task: any) {
  if (!task) {
    return null;
  }

  return {
    id: task.id,
    topic: task.topic ?? task.title ?? "",
    estimatedMinutes: Number(task.estimatedMinutes ?? task.estimated_minutes ?? 0),
    actualMinutes: Number(task.actualMinutes ?? task.actual_minutes ?? 0),
    status: (task.status ?? "pending") as "pending" | "in_progress" | "completed" | "skipped",
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
    status: plan.status ?? "draft",
  };
}

function normalizeResponse(plan: any, tasks: any[]) {
  return {
    plan: normalizePlan(plan),
    tasks: tasks.map(normalizeTask).filter(Boolean),
  };
}

// 生成每日任务的函数
async function generateDailyTasks(userId: string, tenantId: string, planId: string, goalPlanId?: string, dailyMinutes: number = DEFAULT_DAILY_MINUTES) {
  const tasks = [];
  console.log('[generateDailyTasks] Starting with:', { userId, tenantId, planId, goalPlanId, dailyMinutes });
  
  // 如果有指定的学习计划，尝试从学习目标中获取任务
  if (goalPlanId) {
    console.log('[generateDailyTasks] Looking for learning tasks with planId:', goalPlanId);
    const { data: learningTasks, error: tasksError } = await supabaseAdmin
      .from('learning_tasks')
      .select('*')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .eq('plan_id', goalPlanId)
      .eq('status', 'pending')
      .order('created_at')
      .limit(4);

    console.log('[generateDailyTasks] Learning tasks query result:', { learningTasks, tasksError });

    if (!tasksError && learningTasks && learningTasks.length > 0) {
      console.log('[generateDailyTasks] Found', learningTasks.length, 'learning tasks, creating daily tasks');
      // 使用学习目标中的任务
      for (let i = 0; i < learningTasks.length; i++) {
        const task = learningTasks[i];
        const { data: newTask, error: insertError } = await supabaseAdmin
          .from('daily_tasks')
          .insert({
            tenant_id: tenantId,
            daily_plan_id: planId,
            phase_id: task.phase_id,
            topic: task.title,
            estimated_minutes: Math.min(task.estimated_minutes || 60, Math.floor(dailyMinutes / learningTasks.length)),
            actual_minutes: 0,
            status: 'pending',
            order_num: i + 1,
          })
          .select()
          .single();

        console.log('[generateDailyTasks] Created task from learning task:', { newTask, insertError });
        if (!insertError && newTask) {
          tasks.push(newTask);
        }
      }
    } else {
      console.log('[generateDailyTasks] No learning tasks found or error:', tasksError);
    }
  } else {
    console.log('[generateDailyTasks] No goalPlanId provided, will generate default tasks');
  }

  // 如果没有足够的任务，生成默认任务
  if (tasks.length < 3) {
    console.log('[generateDailyTasks] Not enough tasks (', tasks.length, '), generating default tasks');
    
    // 根据学习计划生成具体的任务
    let defaultTasks = [];
    
    if (goalPlanId) {
      // 获取学习计划信息
      const { data: planData } = await supabaseAdmin
        .from('learning_plans')
        .select('title, plan_data')
        .eq('id', goalPlanId)
        .single();
      
      if (planData?.title?.includes('TypeScript')) {
        // TypeScript 学习计划的具体任务
        defaultTasks = [
          {
            topic: '学习TypeScript基础类型系统',
            estimated_minutes: Math.min(60, Math.floor(dailyMinutes * 0.3)),
          },
          {
            topic: '练习TypeScript接口和泛型',
            estimated_minutes: Math.min(45, Math.floor(dailyMinutes * 0.25)),
          },
          {
            topic: '复习TypeScript高级特性',
            estimated_minutes: Math.min(30, Math.floor(dailyMinutes * 0.2)),
          },
          {
            topic: '完成TypeScript实践项目',
            estimated_minutes: Math.max(30, dailyMinutes - 135),
          },
        ];
      } else if (planData?.title?.includes('React')) {
        // React 学习计划的具体任务
        defaultTasks = [
          {
            topic: '学习React组件和JSX',
            estimated_minutes: Math.min(60, Math.floor(dailyMinutes * 0.3)),
          },
          {
            topic: '练习React Hooks和状态管理',
            estimated_minutes: Math.min(45, Math.floor(dailyMinutes * 0.25)),
          },
          {
            topic: '复习React生命周期和性能优化',
            estimated_minutes: Math.min(30, Math.floor(dailyMinutes * 0.2)),
          },
          {
            topic: '完成React项目实践',
            estimated_minutes: Math.max(30, dailyMinutes - 135),
          },
        ];
      }
    }
    
    // 如果没有匹配的具体任务，使用通用任务
    if (defaultTasks.length === 0) {
      defaultTasks = [
        {
          topic: '学习新概念和理论知识',
          estimated_minutes: Math.min(60, Math.floor(dailyMinutes * 0.3)),
        },
        {
          topic: '练习和实践应用',
          estimated_minutes: Math.min(45, Math.floor(dailyMinutes * 0.25)),
        },
        {
          topic: '复习和巩固知识',
          estimated_minutes: Math.min(30, Math.floor(dailyMinutes * 0.2)),
        },
        {
          topic: '完成练习题和项目',
          estimated_minutes: Math.max(30, dailyMinutes - 135),
        },
      ];
    }

    for (let i = tasks.length; i < Math.min(4, defaultTasks.length); i++) {
      const taskData = defaultTasks[i];
      console.log('[generateDailyTasks] Creating default task:', taskData);
      const { data: newTask, error: insertError } = await supabaseAdmin
        .from('daily_tasks')
        .insert({
          tenant_id: tenantId,
          daily_plan_id: planId,
          phase_id: null,
          topic: taskData.topic,
          estimated_minutes: taskData.estimated_minutes,
          actual_minutes: 0,
          status: 'pending',
          order_num: i + 1,
        })
        .select()
        .single();

      console.log('[generateDailyTasks] Default task creation result:', { newTask, insertError });
      if (!insertError && newTask) {
        tasks.push(newTask);
      } else {
        console.error('[generateDailyTasks] Failed to create default task:', insertError);
      }
    }
  }

  console.log('[generateDailyTasks] Final tasks count:', tasks.length);
  return tasks;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) {
      console.error("[daily/generate] No valid user found");
      return NextResponse.json({
        error: "未授权访问",
        details: "请先登录系统"
      }, { status: 401 });
    }

    const json = await request.json();
    const parsed = bodySchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { planId, date, dailyMinutes } = parsed.data;
    const targetDate = date ?? formatTokyoDate(new Date());

    // 获取用户的tenant_id
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('[daily/generate] Error fetching user profile:', profileError);
      return NextResponse.json({
        error: '获取用户信息失败',
        details: '无法获取用户的租户信息'
      }, { status: 500 });
    }

    // 检查是否已存在当天的计划
    const { data: existingPlan, error: planError } = await supabaseAdmin
      .from('daily_plans')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', targetDate)
      .limit(1);

    if (planError) {
      console.error('[daily/generate] Error querying existing plan:', planError);
      return NextResponse.json({
        error: '查询现有计划失败',
        details: planError.message
      }, { status: 500 });
    }

    let plan = existingPlan?.[0];

    // 如果没有现有计划，创建一个新的
    if (!plan) {
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
        console.error('[daily/generate] Error creating daily plan:', insertError);
        return NextResponse.json({
          error: '创建每日计划失败',
          details: insertError.message
        }, { status: 500 });
      }

      plan = newPlan;
    }

    // 检查是否已有任务
    const { data: existingTasks, error: tasksError } = await supabaseAdmin
      .from('daily_tasks')
      .select('*')
      .eq('daily_plan_id', plan.id)
      .order('order_num');

    if (tasksError) {
      console.error('[daily/generate] Error querying existing tasks:', tasksError);
      return NextResponse.json({
        error: '查询现有任务失败',
        details: tasksError.message
      }, { status: 500 });
    }

    // 如果已有任务，直接返回
    if (existingTasks && existingTasks.length > 0) {
      return NextResponse.json(normalizeResponse(plan, existingTasks));
    }

    // 生成新的任务（基于学习目标或使用默认任务）
    console.log('[daily/generate] Calling generateDailyTasks with:', {
      userId: user.id,
      tenantId: profile.tenant_id,
      planId: plan.id,
      goalPlanId: planId,
      dailyMinutes: dailyMinutes ?? DEFAULT_DAILY_MINUTES
    });
    
    const tasks = await generateDailyTasks(user.id, profile.tenant_id, plan.id, planId, dailyMinutes ?? DEFAULT_DAILY_MINUTES);
    
    console.log('[daily/generate] Generated tasks:', tasks);
    console.log('[daily/generate] Returning response with:', normalizeResponse(plan, tasks));

    return NextResponse.json(normalizeResponse(plan, tasks));

  } catch (error) {
    console.error("[daily/generate] POST error", error);
    
    return NextResponse.json({
      error: "生成学习计划失败",
      details: "服务器内部错误，请稍后重试"
    }, { status: 500 });
  }
}