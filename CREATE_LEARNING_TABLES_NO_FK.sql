-- AI学习搭子数据库表创建脚本（无外键约束版本）
-- 请在Supabase SQL编辑器中执行以下SQL

-- 1. 创建学习目标表（无外键约束）
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

-- 2. 创建用户评估表
CREATE TABLE IF NOT EXISTS user_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  goal_id uuid NOT NULL,
  assessment_type varchar(50) NOT NULL,
  questions jsonb NOT NULL,
  answers jsonb NOT NULL,
  score integer NOT NULL CHECK (score >= 0 AND score <= 100),
  level_determined integer NOT NULL CHECK (level_determined >= 1 AND level_determined <= 10),
  created_at timestamp with time zone DEFAULT now()
);

-- 3. 创建学习计划表
CREATE TABLE IF NOT EXISTS learning_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  goal_id uuid NOT NULL,
  title varchar(200) NOT NULL,
  description text,
  total_duration_weeks integer NOT NULL DEFAULT 12,
  difficulty_level integer NOT NULL DEFAULT 5 CHECK (difficulty_level >= 1 AND difficulty_level <= 10),
  plan_content jsonb NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 4. 创建学习任务表
CREATE TABLE IF NOT EXISTS learning_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  plan_id uuid NOT NULL,
  title varchar(200) NOT NULL,
  description text,
  task_type varchar(50) NOT NULL,
  estimated_duration_minutes integer NOT NULL DEFAULT 30,
  difficulty_level integer NOT NULL DEFAULT 5 CHECK (difficulty_level >= 1 AND difficulty_level <= 10),
  due_date timestamp with time zone,
  status varchar(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
  completion_rate integer DEFAULT 0 CHECK (completion_rate >= 0 AND completion_rate <= 100),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 5. 创建学习记录表
CREATE TABLE IF NOT EXISTS learning_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  task_id uuid NOT NULL,
  session_duration_minutes integer NOT NULL DEFAULT 0,
  completion_rate integer NOT NULL DEFAULT 0 CHECK (completion_rate >= 0 AND completion_rate <= 100),
  notes text,
  mood_score integer CHECK (mood_score >= 1 AND mood_score <= 5),
  difficulty_felt integer CHECK (difficulty_felt >= 1 AND difficulty_felt <= 5),
  created_at timestamp with time zone DEFAULT now()
);

-- 6. 创建学习资源表
CREATE TABLE IF NOT EXISTS learning_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  goal_id uuid NOT NULL,
  title varchar(200) NOT NULL,
  description text,
  resource_type varchar(50) NOT NULL,
  url text,
  content jsonb,
  difficulty_level integer DEFAULT 5 CHECK (difficulty_level >= 1 AND difficulty_level <= 10),
  estimated_time_minutes integer DEFAULT 30,
  tags text[],
  is_recommended boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- 7. 创建计划调整记录表
CREATE TABLE IF NOT EXISTS plan_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  plan_id uuid NOT NULL,
  adjustment_type varchar(50) NOT NULL,
  reason text,
  old_content jsonb,
  new_content jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- 8. 创建问答记录表
CREATE TABLE IF NOT EXISTS qa_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  question text NOT NULL,
  answer text NOT NULL,
  context jsonb,
  satisfaction_score integer CHECK (satisfaction_score >= 1 AND satisfaction_score <= 5),
  created_at timestamp with time zone DEFAULT now()
);

-- 9. 创建用户成就表
CREATE TABLE IF NOT EXISTS user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  achievement_type varchar(50) NOT NULL,
  title varchar(200) NOT NULL,
  description text,
  icon varchar(50),
  points integer DEFAULT 0,
  unlocked_at timestamp with time zone DEFAULT now()
);

-- 10. 创建学习搭子配置表
CREATE TABLE IF NOT EXISTS study_buddy_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  tenant_id uuid NOT NULL,
  personality_type varchar(50) DEFAULT 'encouraging',
  interaction_frequency varchar(50) DEFAULT 'moderate',
  reminder_settings jsonb DEFAULT '{}',
  preferred_study_times jsonb DEFAULT '[]',
  motivational_preferences jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_learning_goals_user_tenant ON learning_goals (user_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_learning_goals_status ON learning_goals (status);
CREATE INDEX IF NOT EXISTS idx_user_assessments_user_tenant ON user_assessments (user_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_assessments_goal ON user_assessments (goal_id);
CREATE INDEX IF NOT EXISTS idx_learning_plans_user_tenant ON learning_plans (user_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_learning_plans_goal ON learning_plans (goal_id);
CREATE INDEX IF NOT EXISTS idx_learning_tasks_user_tenant ON learning_tasks (user_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_learning_tasks_plan ON learning_tasks (plan_id);
CREATE INDEX IF NOT EXISTS idx_learning_tasks_due_date ON learning_tasks (due_date);
CREATE INDEX IF NOT EXISTS idx_learning_records_user_tenant ON learning_records (user_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_learning_records_task ON learning_records (task_id);
CREATE INDEX IF NOT EXISTS idx_learning_resources_user_tenant ON learning_resources (user_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_learning_resources_goal ON learning_resources (goal_id);
CREATE INDEX IF NOT EXISTS idx_plan_adjustments_user_tenant ON plan_adjustments (user_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_plan_adjustments_plan ON plan_adjustments (plan_id);
CREATE INDEX IF NOT EXISTS idx_qa_records_user_tenant ON qa_records (user_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_qa_records_created_at ON qa_records (created_at);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_tenant ON user_achievements (user_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_study_buddy_config_user ON study_buddy_config (user_id);

-- 启用 RLS
ALTER TABLE learning_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_buddy_config ENABLE ROW LEVEL SECURITY;

-- 安全地创建 RLS 策略
DO $$ 
BEGIN
  -- learning_goals 策略
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'learning_goals' AND policyname = 'Users can manage their own learning goals') THEN
    DROP POLICY "Users can manage their own learning goals" ON learning_goals;
  END IF;
  CREATE POLICY "Users can manage their own learning goals" ON learning_goals
    FOR ALL USING (auth.uid() = user_id);

  -- user_assessments 策略
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_assessments' AND policyname = 'Users can manage their own assessments') THEN
    DROP POLICY "Users can manage their own assessments" ON user_assessments;
  END IF;
  CREATE POLICY "Users can manage their own assessments" ON user_assessments
    FOR ALL USING (auth.uid() = user_id);

  -- learning_plans 策略
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'learning_plans' AND policyname = 'Users can manage their own learning plans') THEN
    DROP POLICY "Users can manage their own learning plans" ON learning_plans;
  END IF;
  CREATE POLICY "Users can manage their own learning plans" ON learning_plans
    FOR ALL USING (auth.uid() = user_id);

  -- learning_tasks 策略
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'learning_tasks' AND policyname = 'Users can manage their own learning tasks') THEN
    DROP POLICY "Users can manage their own learning tasks" ON learning_tasks;
  END IF;
  CREATE POLICY "Users can manage their own learning tasks" ON learning_tasks
    FOR ALL USING (auth.uid() = user_id);

  -- learning_records 策略
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'learning_records' AND policyname = 'Users can manage their own learning records') THEN
    DROP POLICY "Users can manage their own learning records" ON learning_records;
  END IF;
  CREATE POLICY "Users can manage their own learning records" ON learning_records
    FOR ALL USING (auth.uid() = user_id);

  -- learning_resources 策略
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'learning_resources' AND policyname = 'Users can manage their own learning resources') THEN
    DROP POLICY "Users can manage their own learning resources" ON learning_resources;
  END IF;
  CREATE POLICY "Users can manage their own learning resources" ON learning_resources
    FOR ALL USING (auth.uid() = user_id);

  -- plan_adjustments 策略
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'plan_adjustments' AND policyname = 'Users can manage their own plan adjustments') THEN
    DROP POLICY "Users can manage their own plan adjustments" ON plan_adjustments;
  END IF;
  CREATE POLICY "Users can manage their own plan adjustments" ON plan_adjustments
    FOR ALL USING (auth.uid() = user_id);

  -- qa_records 策略
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'qa_records' AND policyname = 'Users can manage their own QA records') THEN
    DROP POLICY "Users can manage their own QA records" ON qa_records;
  END IF;
  CREATE POLICY "Users can manage their own QA records" ON qa_records
    FOR ALL USING (auth.uid() = user_id);

  -- user_achievements 策略
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_achievements' AND policyname = 'Users can manage their own achievements') THEN
    DROP POLICY "Users can manage their own achievements" ON user_achievements;
  END IF;
  CREATE POLICY "Users can manage their own achievements" ON user_achievements
    FOR ALL USING (auth.uid() = user_id);

  -- study_buddy_config 策略
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'study_buddy_config' AND policyname = 'Users can manage their own study buddy config') THEN
    DROP POLICY "Users can manage their own study buddy config" ON study_buddy_config;
  END IF;
  CREATE POLICY "Users can manage their own study buddy config" ON study_buddy_config
    FOR ALL USING (auth.uid() = user_id);
END $$;

-- 创建或替换触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 安全地创建触发器
DO $$
BEGIN
  -- learning_goals 触发器
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_learning_goals_updated_at') THEN
    DROP TRIGGER update_learning_goals_updated_at ON learning_goals;
  END IF;
  CREATE TRIGGER update_learning_goals_updated_at 
    BEFORE UPDATE ON learning_goals 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

  -- learning_plans 触发器
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_learning_plans_updated_at') THEN
    DROP TRIGGER update_learning_plans_updated_at ON learning_plans;
  END IF;
  CREATE TRIGGER update_learning_plans_updated_at 
    BEFORE UPDATE ON learning_plans 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

  -- learning_tasks 触发器
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_learning_tasks_updated_at') THEN
    DROP TRIGGER update_learning_tasks_updated_at ON learning_tasks;
  END IF;
  CREATE TRIGGER update_learning_tasks_updated_at 
    BEFORE UPDATE ON learning_tasks 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

  -- study_buddy_config 触发器
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_study_buddy_config_updated_at') THEN
    DROP TRIGGER update_study_buddy_config_updated_at ON study_buddy_config;
  END IF;
  CREATE TRIGGER update_study_buddy_config_updated_at 
    BEFORE UPDATE ON study_buddy_config 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
END $$;

-- 完成！
SELECT 'AI学习搭子数据库表创建完成！（无外键约束版本）' as message;
