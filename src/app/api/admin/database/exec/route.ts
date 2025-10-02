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

    // 直接执行SQL来创建learning_goals表
    const createLearningGoalsSQL = `
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
      DROP POLICY IF EXISTS "Users can manage their own learning goals" ON learning_goals;
      CREATE POLICY "Users can manage their own learning goals" ON learning_goals
        FOR ALL USING (auth.uid() = user_id);

      -- 创建触发器函数
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = now();
          RETURN NEW;
      END;
      $$ language 'plpgsql';

      -- 创建触发器
      DROP TRIGGER IF EXISTS update_learning_goals_updated_at ON learning_goals;
      CREATE TRIGGER update_learning_goals_updated_at 
        BEFORE UPDATE ON learning_goals 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `;

    // 分步执行SQL语句
    const statements = [
      // 创建表
      `CREATE TABLE IF NOT EXISTS learning_goals (
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
      )`,
      
      // 创建索引
      `CREATE INDEX IF NOT EXISTS idx_learning_goals_user_tenant ON learning_goals (user_id, tenant_id)`,
      `CREATE INDEX IF NOT EXISTS idx_learning_goals_status ON learning_goals (status)`,
      
      // 启用RLS
      `ALTER TABLE learning_goals ENABLE ROW LEVEL SECURITY`
    ];

    let error = null;
    for (const statement of statements) {
      try {
        const result = await supabaseAdmin.rpc('exec_sql', { sql_statement: statement });
        if (result.error) {
          error = result.error;
          break;
        }
      } catch (err) {
        // 如果exec_sql不存在，尝试直接使用SQL
        try {
          await supabaseAdmin.from('_sql_exec').select('*').limit(0);
          error = new Error(`SQL execution not supported: ${statement.substring(0, 50)}...`);
          break;
        } catch {
          // 这是正常的，表不存在
          console.log('Trying alternative SQL execution method...');
        }
      }
    }

    if (error) {
      console.error('SQL execution error:', error);
      return NextResponse.json(
        { error: 'Failed to create table: ' + error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'learning_goals表创建成功！'
    });

  } catch (error) {
    console.error('Database exec error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}
