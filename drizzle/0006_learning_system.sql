-- 学习系统数据库表创建脚本
-- 创建时间: 2024-10-02

-- 学习目标表
CREATE TABLE IF NOT EXISTS "learning_goals" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "tenant_id" uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  "title" varchar(200) NOT NULL,
  "description" text,
  "type" varchar(20) NOT NULL CHECK (type IN ('exam', 'skill', 'career')),
  "current_level" integer NOT NULL DEFAULT 1 CHECK (current_level >= 1 AND current_level <= 10),
  "target_level" integer NOT NULL DEFAULT 10 CHECK (target_level >= 1 AND target_level <= 10),
  "target_date" timestamp with time zone,
  "status" varchar(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);

-- 用户能力评估表
CREATE TABLE IF NOT EXISTS "user_assessments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "tenant_id" uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  "goal_id" uuid REFERENCES learning_goals(id) ON DELETE CASCADE,
  "assessment_type" varchar(50) NOT NULL DEFAULT 'general',
  "score" integer NOT NULL CHECK (score >= 0 AND score <= 100),
  "strengths" text[] DEFAULT '{}',
  "weaknesses" text[] DEFAULT '{}',
  "recommendations" text[] DEFAULT '{}',
  "assessment_data" jsonb DEFAULT '{}',
  "created_at" timestamp with time zone DEFAULT now()
);

-- 学习计划表
CREATE TABLE IF NOT EXISTS "learning_plans" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "tenant_id" uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  "goal_id" uuid NOT NULL REFERENCES learning_goals(id) ON DELETE CASCADE,
  "title" varchar(200) NOT NULL,
  "description" text,
  "plan_data" jsonb NOT NULL DEFAULT '{}',
  "status" varchar(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
  "start_date" timestamp with time zone DEFAULT now(),
  "end_date" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);

-- 学习任务表
CREATE TABLE IF NOT EXISTS "learning_tasks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "tenant_id" uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  "plan_id" uuid NOT NULL REFERENCES learning_plans(id) ON DELETE CASCADE,
  "goal_id" uuid NOT NULL REFERENCES learning_goals(id) ON DELETE CASCADE,
  "title" varchar(200) NOT NULL,
  "description" text,
  "type" varchar(20) NOT NULL CHECK (type IN ('reading', 'practice', 'quiz', 'project', 'review')),
  "difficulty" integer NOT NULL DEFAULT 3 CHECK (difficulty >= 1 AND difficulty <= 5),
  "estimated_minutes" integer NOT NULL DEFAULT 60,
  "actual_minutes" integer DEFAULT 0,
  "resources" text[] DEFAULT '{}',
  "status" varchar(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
  "due_date" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);

-- 学习记录表
CREATE TABLE IF NOT EXISTS "learning_records" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "tenant_id" uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  "task_id" uuid REFERENCES learning_tasks(id) ON DELETE CASCADE,
  "goal_id" uuid REFERENCES learning_goals(id) ON DELETE CASCADE,
  "session_type" varchar(50) NOT NULL DEFAULT 'study',
  "duration_minutes" integer NOT NULL DEFAULT 0,
  "productivity_score" integer CHECK (productivity_score >= 1 AND productivity_score <= 5),
  "mood_score" integer CHECK (mood_score >= 1 AND mood_score <= 5),
  "notes" text,
  "achievements" text[] DEFAULT '{}',
  "session_data" jsonb DEFAULT '{}',
  "created_at" timestamp with time zone DEFAULT now()
);

-- 学习资源表
CREATE TABLE IF NOT EXISTS "learning_resources" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  "tenant_id" uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  "goal_id" uuid REFERENCES learning_goals(id) ON DELETE CASCADE,
  "title" varchar(200) NOT NULL,
  "description" text,
  "type" varchar(50) NOT NULL CHECK (type IN ('book', 'video', 'article', 'course', 'website', 'document', 'other')),
  "url" text,
  "file_path" text,
  "tags" text[] DEFAULT '{}',
  "difficulty" integer CHECK (difficulty >= 1 AND difficulty <= 5),
  "estimated_time_minutes" integer DEFAULT 0,
  "rating" integer CHECK (rating >= 1 AND rating <= 5),
  "is_public" boolean DEFAULT false,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);

-- 计划调整记录表
CREATE TABLE IF NOT EXISTS "plan_adjustments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "tenant_id" uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  "plan_id" uuid NOT NULL REFERENCES learning_plans(id) ON DELETE CASCADE,
  "adjustment_type" varchar(50) NOT NULL,
  "reason" text NOT NULL,
  "old_data" jsonb DEFAULT '{}',
  "new_data" jsonb DEFAULT '{}',
  "ai_suggested" boolean DEFAULT false,
  "created_at" timestamp with time zone DEFAULT now()
);

-- 问答记录表
CREATE TABLE IF NOT EXISTS "qa_records" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "tenant_id" uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  "goal_id" uuid REFERENCES learning_goals(id) ON DELETE CASCADE,
  "question" text NOT NULL,
  "answer" text NOT NULL,
  "category" varchar(100) DEFAULT 'general',
  "confidence" decimal(3,2) DEFAULT 0.85,
  "context" text,
  "follow_up_questions" text[] DEFAULT '{}',
  "helpful_rating" integer CHECK (helpful_rating >= 1 AND helpful_rating <= 5),
  "created_at" timestamp with time zone DEFAULT now()
);

-- 用户成就表
CREATE TABLE IF NOT EXISTS "user_achievements" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "tenant_id" uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  "achievement_type" varchar(100) NOT NULL,
  "title" varchar(200) NOT NULL,
  "description" text,
  "badge_icon" varchar(100),
  "points" integer DEFAULT 0,
  "unlocked_at" timestamp with time zone DEFAULT now(),
  "metadata" jsonb DEFAULT '{}'
);

-- 学习搭子配置表
CREATE TABLE IF NOT EXISTS "study_buddy_config" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "tenant_id" uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  "personality_type" varchar(50) DEFAULT 'friendly',
  "interaction_style" varchar(50) DEFAULT 'encouraging',
  "reminder_frequency" varchar(50) DEFAULT 'daily',
  "preferred_study_times" text[] DEFAULT '{}',
  "motivation_triggers" text[] DEFAULT '{}',
  "custom_responses" jsonb DEFAULT '{}',
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, tenant_id)
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS "idx_learning_goals_user_tenant" ON "learning_goals" ("user_id", "tenant_id");
CREATE INDEX IF NOT EXISTS "idx_learning_goals_status" ON "learning_goals" ("status");
CREATE INDEX IF NOT EXISTS "idx_user_assessments_user_goal" ON "user_assessments" ("user_id", "goal_id");
CREATE INDEX IF NOT EXISTS "idx_learning_plans_user_goal" ON "learning_plans" ("user_id", "goal_id");
CREATE INDEX IF NOT EXISTS "idx_learning_plans_status" ON "learning_plans" ("status");
CREATE INDEX IF NOT EXISTS "idx_learning_tasks_plan_status" ON "learning_tasks" ("plan_id", "status");
CREATE INDEX IF NOT EXISTS "idx_learning_tasks_user_due" ON "learning_tasks" ("user_id", "due_date");
CREATE INDEX IF NOT EXISTS "idx_learning_records_user_date" ON "learning_records" ("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "idx_learning_resources_goal" ON "learning_resources" ("goal_id");
CREATE INDEX IF NOT EXISTS "idx_learning_resources_public" ON "learning_resources" ("is_public") WHERE is_public = true;
CREATE INDEX IF NOT EXISTS "idx_qa_records_user_date" ON "qa_records" ("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "idx_user_achievements_user" ON "user_achievements" ("user_id");

-- 添加 RLS 策略
ALTER TABLE "learning_goals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_assessments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "learning_plans" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "learning_tasks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "learning_records" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "learning_resources" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "plan_adjustments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "qa_records" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_achievements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "study_buddy_config" ENABLE ROW LEVEL SECURITY;

-- 创建 RLS 策略（用户只能访问自己的数据）
CREATE POLICY "Users can manage their own learning goals" ON "learning_goals"
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own assessments" ON "user_assessments"
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own learning plans" ON "learning_plans"
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own learning tasks" ON "learning_tasks"
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own learning records" ON "learning_records"
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own learning resources" ON "learning_resources"
  FOR ALL USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can manage their own plan adjustments" ON "plan_adjustments"
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own QA records" ON "qa_records"
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own achievements" ON "user_achievements"
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own study buddy config" ON "study_buddy_config"
  FOR ALL USING (auth.uid() = user_id);

-- 添加触发器以自动更新 updated_at 字段
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_learning_goals_updated_at BEFORE UPDATE ON learning_goals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_learning_plans_updated_at BEFORE UPDATE ON learning_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_learning_tasks_updated_at BEFORE UPDATE ON learning_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_learning_resources_updated_at BEFORE UPDATE ON learning_resources FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_study_buddy_config_updated_at BEFORE UPDATE ON study_buddy_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
