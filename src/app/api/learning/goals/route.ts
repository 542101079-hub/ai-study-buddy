// 学习目标管理 API 路由
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

    // 获取用户的所有学习目标
    const { data: goals, error } = await supabaseAdmin
      .from('learning_goals')
      .select(`
        *,
        learning_plans (
          id,
          title,
          status,
          created_at
        )
      `)
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch learning goals:', error);
      return NextResponse.json(
        { error: 'Failed to fetch learning goals' },
        { status: 500 }
      );
    }

    return NextResponse.json({ goals });
  } catch (error) {
    console.error('Learning goals API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { title, description, type, current_level, target_level, target_date, tenant_id } = body;

    // 验证必填字段
    if (!title || !type || !tenant_id) {
      return NextResponse.json(
        { error: 'Title, type, and tenant_id are required' },
        { status: 400 }
      );
    }

    // 验证类型
    if (!['exam', 'skill', 'career'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid goal type' },
        { status: 400 }
      );
    }

    // 验证等级范围
    if (current_level < 1 || current_level > 10 || target_level < 1 || target_level > 10) {
      return NextResponse.json(
        { error: 'Levels must be between 1 and 10' },
        { status: 400 }
      );
    }

    if (current_level >= target_level) {
      return NextResponse.json(
        { error: 'Target level must be higher than current level' },
        { status: 400 }
      );
    }

    // 创建学习目标
    const { data: goal, error } = await supabaseAdmin
      .from('learning_goals')
      .insert({
        user_id: session.user.id,
        tenant_id,
        title,
        description: description || null,
        type,
        current_level: current_level || 1,
        target_level: target_level || 10,
        target_date: target_date ? new Date(target_date).toISOString() : null,
        status: 'active'
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create learning goal:', error);
      return NextResponse.json(
        { error: 'Failed to create learning goal' },
        { status: 500 }
      );
    }

    return NextResponse.json({ goal }, { status: 201 });
  } catch (error) {
    console.error('Create learning goal error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
