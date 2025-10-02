// 今日学习任务 API 路由
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getServerSession } from '@supabase/auth-helpers-nextjs';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 获取今天的开始和结束时间
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    // 获取今日任务
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
      .eq('user_id', session.user.id)
      .gte('due_date', startOfDay.toISOString())
      .lt('due_date', endOfDay.toISOString())
      .order('due_date', { ascending: true });

    if (error) {
      console.error('Failed to fetch today tasks:', error);
      return NextResponse.json(
        { error: 'Failed to fetch today tasks' },
        { status: 500 }
      );
    }

    // 计算统计信息
    const stats = {
      total: tasks.length,
      completed: tasks.filter(task => task.status === 'completed').length,
      pending: tasks.filter(task => task.status === 'pending').length,
      in_progress: tasks.filter(task => task.status === 'in_progress').length,
      total_estimated_minutes: tasks.reduce((sum, task) => sum + (task.estimated_minutes || 0), 0),
      completed_minutes: tasks
        .filter(task => task.status === 'completed')
        .reduce((sum, task) => sum + (task.actual_minutes || task.estimated_minutes || 0), 0)
    };

    return NextResponse.json({ tasks, stats });
  } catch (error) {
    console.error('Today tasks API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { taskId, status, actual_minutes, notes } = body;

    if (!taskId || !status) {
      return NextResponse.json(
        { error: 'Task ID and status are required' },
        { status: 400 }
      );
    }

    // 验证状态
    if (!['pending', 'in_progress', 'completed', 'skipped'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    };

    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
      if (actual_minutes) {
        updateData.actual_minutes = actual_minutes;
      }
    }

    // 更新任务状态
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
        { status: 500 }
      );
    }

    // 如果任务完成，记录学习记录
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
            difficulty: task.difficulty
          }
        });

      if (recordError) {
        console.error('Failed to create learning record:', recordError);
        // 不返回错误，因为任务更新已经成功
      }
    }

    return NextResponse.json({ task });
  } catch (error) {
    console.error('Update task error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
