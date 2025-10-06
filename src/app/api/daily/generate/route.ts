import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerUser } from "@/lib/supabase/server";

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

// 临时Mock数据生成器
function generateMockDailyPlan(userId: string, targetDate: string, dailyMinutes: number) {
  const mockPlan = {
    id: `mock-plan-${Date.now()}`,
    tenant_id: 'mock-tenant-id',
    user_id: userId,
    plan_id: null,
    date: targetDate,
    target_minutes: dailyMinutes,
    actual_minutes: 0,
    status: 'draft',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockTasks = [
    {
      id: `mock-task-1-${Date.now()}`,
      tenant_id: 'mock-tenant-id',
      daily_plan_id: mockPlan.id,
      phase_id: null,
      topic: '学习React基础概念',
      estimated_minutes: Math.min(60, Math.floor(dailyMinutes * 0.3)),
      actual_minutes: 0,
      status: 'pending',
      order_num: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: `mock-task-2-${Date.now()}`,
      tenant_id: 'mock-tenant-id',
      daily_plan_id: mockPlan.id,
      phase_id: null,
      topic: '练习TypeScript类型系统',
      estimated_minutes: Math.min(45, Math.floor(dailyMinutes * 0.25)),
      actual_minutes: 0,
      status: 'pending',
      order_num: 2,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: `mock-task-3-${Date.now()}`,
      tenant_id: 'mock-tenant-id',
      daily_plan_id: mockPlan.id,
      phase_id: null,
      topic: '复习JavaScript异步编程',
      estimated_minutes: Math.min(30, Math.floor(dailyMinutes * 0.2)),
      actual_minutes: 0,
      status: 'pending',
      order_num: 3,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: `mock-task-4-${Date.now()}`,
      tenant_id: 'mock-tenant-id',
      daily_plan_id: mockPlan.id,
      phase_id: null,
      topic: '完成练习题和项目实践',
      estimated_minutes: Math.max(30, dailyMinutes - 135), // 剩余时间
      actual_minutes: 0,
      status: 'pending',
      order_num: 4,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  return { plan: mockPlan, tasks: mockTasks };
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

export async function POST(request: NextRequest) {
  let user: Awaited<ReturnType<typeof getServerUser>> | null = null;
  let targetDate: string | null = null;

  try {
    user = await getServerUser();
    if (!user) {
      console.error("[daily/generate] No valid user found");
      return NextResponse.json({
        error: "未授权访问",
        details: "请先登录系统"
      }, { status: 401 });
    }

    // 临时使用Mock数据，绕过DNS问题
    console.log("[daily/generate] Using mock data due to DNS issues");

    const json = await request.json();
    const parsed = bodySchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { planId, date, dailyMinutes } = parsed.data;
    targetDate = date ?? formatTokyoDate(new Date());

    // 生成Mock数据
    const mockData = generateMockDailyPlan(user.id, targetDate, dailyMinutes ?? DEFAULT_DAILY_MINUTES);
    
    const normalized = normalizeResponse(mockData.plan, mockData.tasks);
    return NextResponse.json(normalized);

  } catch (error) {
    console.error("[daily/generate] POST error", error);
    
    return NextResponse.json({
      error: "生成学习计划失败",
      details: "服务器内部错误，请稍后重试"
    }, { status: 500 });
  }
}