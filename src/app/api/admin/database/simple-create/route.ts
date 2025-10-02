import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getServerSession } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 尝试创建一个测试记录来检查表是否存在
    const testData = {
      user_id: session.user.id,
      tenant_id: '00000000-0000-0000-0000-000000000000', // 临时测试UUID
      title: 'test',
      type: 'exam',
      current_level: 1,
      target_level: 2,
      status: 'active'
    };

    console.log('Testing table with data:', testData);

    const { data, error } = await supabaseAdmin
      .from('learning_goals')
      .insert(testData)
      .select()
      .single();

    if (error) {
      console.error('Table test failed:', error);
      
      // 如果表不存在，返回指导信息
      if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
        return NextResponse.json({
          error: 'learning_goals表不存在',
          solution: '请在Supabase SQL编辑器中手动执行以下SQL',
          sql: `
-- 创建学习目标表
CREATE TABLE IF NOT EXISTS learning_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  title varchar(200) NOT NULL,
  description text,
  type varchar(20) NOT NULL CHECK (type IN ('exam', 'skill', 'career')),
  current_level integer NOT NULL DEFAULT 1 CHECK (current_level >= 1 AND current_level <= 10),
  target_level integer NOT NULL DEFAULT 10 CHECK (target_level >= 1 AND target_level <= 10),
  target_date timestamp with time zone,
  status varchar(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_learning_goals_user_tenant ON learning_goals (user_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_learning_goals_status ON learning_goals (status);

-- 启用 RLS
ALTER TABLE learning_goals ENABLE ROW LEVEL SECURITY;

-- 创建 RLS 策略
CREATE POLICY "Users can manage their own learning goals" ON learning_goals
  FOR ALL USING (auth.uid() = user_id);
          `
        }, { status: 400 });
      }
      
      return NextResponse.json(
        { error: 'Database error: ' + error.message, code: error.code },
        { status: 500 }
      );
    }

    // 如果成功创建了测试记录，删除它
    if (data?.id) {
      await supabaseAdmin
        .from('learning_goals')
        .delete()
        .eq('id', data.id);
    }

    return NextResponse.json({
      message: 'learning_goals表已存在并可正常使用！',
      success: true
    });

  } catch (error) {
    console.error('Database check error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}
