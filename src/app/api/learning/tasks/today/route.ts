// 今日学习任务 API 路由
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getServerSession } from '@/lib/supabase/server';

const ALLOWED_TASK_TYPES = new Set([
  'study',
  'reading',
  'practice',
  'quiz',
  'project',
  'review',
  'coding',
]);

interface TodayTaskResponse {
  tasks: any[];
  stats: {
    total: number;
    completed: number;
    pending: number;
    in_progress: number;
    total_estimated_minutes: number;
    completed_minutes: number;
  };
}

function getTodayRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return { start, end };
}

async function fetchTodayTasks(userId: string): Promise<TodayTaskResponse> {
  const { start, end } = getTodayRange();

  const { data: tasks, error } = await supabaseAdmin
    .from('learning_tasks')
    .select(`
      *,
      learning_goals (
        id,
        title,
        type
      ),
      learning_plans (
        id,
        title
      )
    `)
    .eq('id', userId)
    .gte('due_date', start.toISOString())
    .lt('due_date', end.toISOString())
    .order('due_date', { ascending: true });

  if (error) {
    throw error;
  }

  const safeTasks = tasks || [];

  const stats = {
    total: safeTasks.length,
    completed: safeTasks.filter((task) => task.status === 'completed').length,
    pending: safeTasks.filter((task) => task.status === 'pending').length,
    in_progress: safeTasks.filter((task) => task.status === 'in_progress').length,
    total_estimated_minutes: safeTasks.reduce(
      (sum, task) => sum + (task.estimated_minutes || 0),
      0,
    ),
    completed_minutes: safeTasks
      .filter((task) => task.status === 'completed')
      .reduce((sum, task) => sum + (task.actual_minutes || task.estimated_minutes || 0), 0),
  };

  return { tasks: safeTasks, stats };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

async function resolveTenantId(userId: string) {
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('tenant_id')
    .eq('id', userId)
    .maybeSingle();

  if (profile?.tenant_id) {
    return profile.tenant_id;
  }

  const { data: fallbackTenant } = await supabaseAdmin
    .from('tenants')
    .select('id')
    .eq('slug', 'ai-study-buddy')
    .maybeSingle();

  return fallbackTenant?.id ?? null;
}

function getDueDateForBlock(timeBlock?: string): Date {
  const { start } = getTodayRange();
  const due = new Date(start);

  switch (timeBlock) {
    case 'morning':
      due.setHours(9, 0, 0, 0);
      break;
    case 'afternoon':
      due.setHours(14, 0, 0, 0);
      break;
    case 'evening':
      due.setHours(19, 0, 0, 0);
      break;
    default:
      due.setHours(new Date().getHours(), new Date().getMinutes(), 0, 0);
      break;
  }

  return due;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const payload = await fetchTodayTasks(session.user.id);
    return NextResponse.json(payload);
  } catch (error) {
    console.error('Today tasks API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch today tasks' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const body = await request.json();
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const description =
      typeof body.description === 'string' ? body.description.trim() : '';
    const type = typeof body.type === 'string' ? body.type.trim() : 'study';
    const timeBlock = typeof body.time_block === 'string' ? body.time_block : undefined;

    if (!title) {
      return NextResponse.json(
        { error: '任务标题不能为空' },
        { status: 400 },
      );
    }

    const normalizedType = ALLOWED_TASK_TYPES.has(type) ? type : 'study';
    const estimatedMinutes = clamp(Number(body.estimated_minutes) || 0, 5, 480);
    const difficulty = clamp(Number(body.difficulty) || 0, 1, 10);

    const tenantId = await resolveTenantId(session.user.id);
    if (!tenantId) {
      return NextResponse.json(
        { error: '用户缺少可用的租户，无法创建任务' },
        { status: 400 },
      );
    }

    const dueDate = getDueDateForBlock(timeBlock).toISOString();

    const insertPayload = {
      user_id: session.user.id,
      tenant_id: tenantId,
      plan_id: body.plan_id || null,
      goal_id: body.goal_id || null,
      title,
      description: description || null,
      type: normalizedType,
      difficulty,
      estimated_minutes: estimatedMinutes,
      resources: body.resources && Array.isArray(body.resources) ? body.resources : [],
      status: 'pending' as const,
      due_date: dueDate,
    };

    const { error: insertError } = await supabaseAdmin
      .from('learning_tasks')
      .insert(insertPayload);

    if (insertError) {
      console.error('Failed to create today task:', insertError);
      return NextResponse.json(
        { error: '创建今日任务失败' },
        { status: 500 },
      );
    }

    const payload = await fetchTodayTasks(session.user.id);
    return NextResponse.json(payload, { status: 201 });
  } catch (error) {
    console.error('Create today task error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { taskId, status, actual_minutes, notes } = body;

    if (!taskId || !status) {
      return NextResponse.json(
        { error: 'Task ID and status are required' },
        { status: 400 },
      );
    }

    if (!['pending', 'in_progress', 'completed', 'skipped'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 },
      );
    }

    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
      if (actual_minutes) {
        updateData.actual_minutes = actual_minutes;
      }
    }

    const { data: task, error } = await supabaseAdmin
      .from('learning_tasks')
      .update(updateData)
      .eq('id', taskId)
      .eq('user_id', session.user.id)
      .select()
      .single();

    if (error) {
      console.error('Failed to update task:', error);
      return NextResponse.json(
        { error: 'Failed to update task' },
        { status: 500 },
      );
    }

    if (status === 'completed') {
      const { error: recordError } = await supabaseAdmin
        .from('learning_records')
        .insert({
          user_id: session.user.id,
          tenant_id: task.tenant_id,
          task_id: taskId,
          goal_id: task.goal_id,
          session_type: 'task_completion',
          duration_minutes: actual_minutes || task.estimated_minutes || 0,
          notes: notes || null,
          session_data: {
            task_title: task.title,
            task_type: task.type,
            difficulty: task.difficulty,
          },
        });

      if (recordError) {
        console.error('Failed to create learning record:', recordError);
      }
    }

    const payload = await fetchTodayTasks(session.user.id);
    return NextResponse.json(payload);
  } catch (error) {
    console.error('Update task error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
