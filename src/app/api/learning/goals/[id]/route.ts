import { NextRequest, NextResponse } from 'next/server';
import { getServerSession, supabaseAdmin } from '@/lib/supabase/server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const goalId = params.id;
    if (!goalId) {
      return NextResponse.json(
        { error: 'Goal ID is required' },
        { status: 400 }
      );
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(goalId)) {
      return NextResponse.json(
        { error: 'Invalid goal ID format' },
        { status: 400 }
      );
    }

    const { data: goal, error: goalError } = await supabaseAdmin
      .from('learning_goals')
      .select('id, user_id, tenant_id')
      .eq('id', goalId)
      .single();

    if (goalError || !goal) {
      return NextResponse.json(
        { error: 'Goal not found' },
        { status: 404 }
      );
    }

    if (goal.user_id !== session.user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this goal' },
        { status: 403 }
      );
    }

    await supabaseAdmin
      .from('learning_records')
      .delete()
      .eq('goal_id', goalId)
      .eq('user_id', session.user.id);

    await supabaseAdmin
      .from('learning_tasks')
      .delete()
      .eq('goal_id', goalId)
      .eq('user_id', session.user.id);

    await supabaseAdmin
      .from('learning_plans')
      .delete()
      .eq('goal_id', goalId)
      .eq('user_id', session.user.id);

    const { error: deleteError } = await supabaseAdmin
      .from('learning_goals')
      .delete()
      .eq('id', goalId)
      .eq('user_id', session.user.id);

    if (deleteError) {
      console.error('Failed to delete goal:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete goal' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete goal error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
