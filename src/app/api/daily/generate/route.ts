
import { NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';

import { getServerSession, supabaseAdmin } from '@/lib/supabase/server';
import { generateDailyPlan } from '@/lib/planner/daily';

const DEFAULT_DAILY_MINUTES = 240;
const TOKYO_OFFSET_MS = 9 * 60 * 60 * 1000;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const bodySchema = z.object({
  planId: z.string().trim().min(1).optional(),
  date: z.string().trim().regex(DATE_REGEX).optional(),
  dailyMinutes: z
    .union([z.number(), z.string()])
    .transform((value) => Number(value))
    .refine((value) => Number.isFinite(value) && value > 0, 'dailyMinutes must be a positive number')
    .optional(),
});

const querySchema = z.object({
  planId: z.string().trim().min(1).optional(),
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
    orderNum: task.orderNum ?? task.order_num ?? null,
  };
}

function normalizePlan(plan: any) {
  if (!plan) {
    return null;
  }

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

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = await resolveTenantId(session.user.id);
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant not found for user' }, { status: 400 });
    }

    const json = await request.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { planId, date, dailyMinutes } = parsed.data;

    const result = await generateDailyPlan({
      userId: session.user.id,
      tenantId,
      planId: planId ?? null,
      date: date ?? formatTokyoDate(new Date()),
      dailyMinutes: dailyMinutes ?? DEFAULT_DAILY_MINUTES,
    });

    const normalized = normalizeResponse(result.plan, result.tasks);
    return NextResponse.json(normalized);
  } catch (error) {
    console.error('[daily/generate] POST error', error);
    return NextResponse.json({ error: 'Failed to generate daily plan' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = await resolveTenantId(session.user.id);
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant not found for user' }, { status: 400 });
    }

    const url = new URL(request.url);
    const parsed = querySchema.safeParse({
      planId: url.searchParams.get('planId') ?? undefined,
      date: url.searchParams.get('date') ?? undefined,
      dailyMinutes: url.searchParams.get('dailyMinutes') ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { planId, date, dailyMinutes } = parsed.data;
    const targetDate = date ?? formatTokyoDate(new Date());

    const { data: existingPlan, error } = await supabaseAdmin
      .from('daily_plans')
      .select('*, daily_tasks(*)')
      .eq('user_id', session.user.id)
      .eq('tenant_id', tenantId)
      .eq('date', targetDate)
      .maybeSingle();

    if (error) {
      console.error('[daily/generate] GET fetch error', error);
      return NextResponse.json({ error: 'Failed to load daily plan' }, { status: 500 });
    }

    if (existingPlan) {
      return NextResponse.json(normalizeResponse(existingPlan, existingPlan.daily_tasks ?? []));
    }

    const result = await generateDailyPlan({
      userId: session.user.id,
      tenantId,
      planId: planId ?? null,
      date: targetDate,
      dailyMinutes: dailyMinutes ?? DEFAULT_DAILY_MINUTES,
    });

    return NextResponse.json(normalizeResponse(result.plan, result.tasks));
  } catch (error) {
    console.error('[daily/generate] GET error', error);
    return NextResponse.json({ error: 'Failed to retrieve daily plan' }, { status: 500 });
  }
}
