import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getServerSession } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { planId } = await params;

    if (!planId) {
      return NextResponse.json(
        { error: 'Plan ID is required' },
        { status: 400 }
      );
    }

    // 获取学习计划详情
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
