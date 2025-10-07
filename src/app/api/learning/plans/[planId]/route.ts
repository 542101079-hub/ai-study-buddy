import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getServerSession } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ planId: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { planId } = await context.params;

    if (!planId) {
      return NextResponse.json(
        { error: 'Plan ID is required' },
        { status: 400 }
      );
    }

    const { data: plan, error } = await supabaseAdmin
      .from('learning_plans')
      .select(`
        *,
        learning_goals (
          id,
          title,
          type
        )
      `)
      .eq('id', planId)
      .eq('user_id', session.user.id)
      .single();

    if (error || !plan) {
      console.error('Failed to fetch plan:', error);
      return NextResponse.json(
        { error: 'Plan not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      plan,
      message: 'Plan details retrieved successfully'
    });

  } catch (error) {
    console.error('Get plan details error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ planId: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { planId } = await context.params;

    if (!planId) {
      return NextResponse.json(
        { error: 'Plan ID is required' },
        { status: 400 }
      );
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(planId)) {
      return NextResponse.json(
        { error: 'Invalid plan ID format' },
        { status: 400 }
      );
    }

    const { data: plan, error: planError } = await supabaseAdmin
      .from('learning_plans')
      .select('id, user_id, tenant_id')
      .eq('id', planId)
      .single();

    if (planError || !plan) {
      return NextResponse.json(
        { error: 'Plan not found' },
        { status: 404 }
      );
    }

    if (plan.user_id !== session.user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this plan' },
        { status: 403 }
      );
    }

    const { data: planTasks } = await supabaseAdmin
      .from('learning_tasks')
      .select('id')
      .eq('plan_id', planId)
      .eq('user_id', session.user.id);

    if (planTasks && planTasks.length > 0) {
      const taskIds = planTasks.map(task => task.id);
      await supabaseAdmin
        .from('learning_records')
        .delete()
        .in('task_id', taskIds);
    }

    await supabaseAdmin
      .from('learning_tasks')
      .delete()
      .eq('plan_id', planId)
      .eq('user_id', session.user.id);

    const { error: deleteError } = await supabaseAdmin
      .from('learning_plans')
      .delete()
      .eq('id', planId)
      .eq('user_id', session.user.id);

    if (deleteError) {
      console.error('Failed to delete plan:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete plan' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete plan error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
